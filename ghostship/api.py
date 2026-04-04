"""GhostShip API with validation, logging, and security."""

import json
import structlog
from io import BytesIO
from pathlib import Path
import os
import psycopg2
from psycopg2.extras import DictCursor
import contextlib

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

from .document_analysis import DocumentProcessingError, analyze_document_set
from .main import normalize_analysis_settings, summarize_shipments
from .models import ShipmentValidationError, AnalysisSettings

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger("ghostship.api")

app = Flask(__name__)

# File size limits (in bytes)
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB for documents
MAX_CSV_SIZE = 10 * 1024 * 1024  # 10MB for CSV files
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# CORS configuration - Allow all for now, but should be restricted in production
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Document fields configuration
DOCUMENT_FIELDS = ("invoice", "packing_list", "bill_of_lading")
DOCUMENT_MAX_SIZE = 10 * 1024 * 1024  # 10MB per document

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "officers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# CSV column aliases for normalization
CSV_COLUMN_ALIASES = {
    "shipment_id": ["shipment_i", "shipmentid", "shipment"],
    "company_id": ["company_i", "companyid"],
    "company_name": ["company", "company_n", "company_name"],
    "commodity": ["product", "commodity_type"],
    "weight_kg": ["weight", "gross_weight", "gross_weight_kg"],
    "declared_value_usd": ["declared_v", "declared_value", "declared_val"],
    "physical_value_usd": ["physical_va", "physical_value", "physical_val"],
    "igm_quantity": ["igm_quanti", "igm_qty"],
    "bol_quantity": ["bol_quanti", "bol_qty"],
    "invoice_quantity": ["invoice_qu", "invoice_qty", "invoice_quant"],
    "igm_value": ["igm_val", "igmvalue"],
    "bol_value": ["bol_val", "bolvalue"],
    "invoice_value": ["invoice_val", "invoicevalue"],
    "actual_origin_country": ["actual_orig", "actual_o", "actual_origin"],
    "declared_origin_country": ["declared_orig", "declared_o", "declared_origin"],
    "route": ["route_name"],
    "route_risk_score": ["route_risk", "route_risk_s"],
    "account_age_days": ["account_ag", "account_age"],
    "company_trust_score": ["company_t", "trust_score", "company_tr"],
    "kyc_verified": ["kyc_verifie", "kyc_verified_flag"],
    "submission_hour": ["submission", "submission_h", "submitted_hour"],
    "burst_count": ["burst_coun", "burst_cnt"],
    "linked_company_id": ["linked_com", "linked_company"],
    "shared_director_flag": ["shared_dir", "shared_director"],
    "pickup_attempts": ["pickup_att", "pickup_attempt"],
    "driver_verified": ["driver_veri", "driver_verified_flag"],
    "risk_score": ["risk_scor"],
    "is_anomalous": ["is_anomal", "is_anomaly", "anomaly_flag"],
    "fraud_type": ["fraud_typ"],
    "temperature_celsius": ["temperatu", "temperature", "temp_c", "temperature_c"],
    "volume_cbm": ["volume_cb", "volume", "cbm"],
    "corrected_physics_anomaly": ["corrected_1", "corrected_physics_an"],
    "anomaly_reason": ["anomaly_r", "anomaly_reason"],
    "director_id": ["director_ids", "director_i"],
}


@contextlib.contextmanager
def _db_connection():
    """Get a PostgreSQL database connection."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    conn = psycopg2.connect(db_url)
    try:
        yield conn
    finally:
        conn.close()


def _init_db():
    """Initialize database with officer profile table."""
    with _db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS officer_profiles (
                    id INTEGER PRIMARY KEY,
                    full_name TEXT NOT NULL,
                    role_title TEXT NOT NULL,
                    badge_id TEXT NOT NULL,
                    email TEXT,
                    terminal TEXT,
                    shift_name TEXT,
                    photo_path TEXT,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cursor.execute("SELECT id FROM officer_profiles WHERE id = 1")
            existing = cursor.fetchone()
            if existing is None:
                cursor.execute(
                    """
                    INSERT INTO officer_profiles (
                        id, full_name, role_title, badge_id, email, terminal, shift_name, photo_path
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        1,
                        "Officer A. Rahman",
                        "Customs Risk Officer",
                        "ID CR-4172",
                        "arahman@ghostship.local",
                        "Terminal 4",
                        "Morning Shift",
                        None,
                    ),
                )
                logger.info("initialized_default_officer_profile")
            connection.commit()


def _serialize_profile(row):
    """Serialize officer profile from database row."""
    if not row:
        return None
    return {
        "full_name": row["full_name"],
        "role_title": row["role_title"],
        "badge_id": row["badge_id"],
        "email": row["email"] or "",
        "terminal": row["terminal"] or "",
        "shift_name": row["shift_name"] or "",
        "photo_url": f"/uploads/officers/{row['photo_path']}" if row["photo_path"] else None,
    }


def _get_profile():
    """Get officer profile from database."""
    with _db_connection() as connection:
        with connection.cursor(cursor_factory=DictCursor) as cursor:
            cursor.execute("SELECT * FROM officer_profiles WHERE id = 1")
            row = cursor.fetchone()
    return _serialize_profile(row)


def _canonicalize_column_name(name):
    """Normalize column name for matching."""
    return "".join(ch for ch in str(name).strip().lower() if ch.isalnum())


def _normalize_dataframe_columns(dataframe):
    """Normalize DataFrame column names using aliases."""
    column_lookup = {_canonicalize_column_name(column): column for column in dataframe.columns}
    rename_map = {}

    for canonical_name, aliases in CSV_COLUMN_ALIASES.items():
        if canonical_name in dataframe.columns:
            continue

        canonical_key = _canonicalize_column_name(canonical_name)
        source_column = column_lookup.get(canonical_key)
        if source_column is None:
            for alias in aliases:
                source_column = column_lookup.get(_canonicalize_column_name(alias))
                if source_column is not None:
                    break

        if source_column is not None:
            rename_map[source_column] = canonical_name

    return dataframe.rename(columns=rename_map)


def _normalize_records(dataframe):
    """Normalize DataFrame and convert to records."""
    normalized = _normalize_dataframe_columns(dataframe)
    return normalized.where(pd.notnull(normalized), None).to_dict(orient="records")


def _validate_file_size(file_storage, max_size, filename):
    """Validate uploaded file size."""
    file_storage.seek(0, 2)  # Seek to end
    size = file_storage.tell()
    file_storage.seek(0)  # Reset to beginning
    
    if size > max_size:
        raise ValueError(f"File '{filename}' exceeds maximum size of {max_size / 1024 / 1024:.1f}MB")
    if size == 0:
        raise ValueError(f"File '{filename}' is empty")
    
    return size


# Initialize database
_init_db()


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(error):
    """Handle file size exceeded error."""
    logger.warning("file_upload_exceeded_limit", error=str(error))
    return jsonify({"ok": False, "message": "File too large. Maximum size is 50MB."}), 413


@app.errorhandler(404)
def handle_not_found(error):
    """Handle 404 errors."""
    logger.warning("endpoint_not_found", path=request.path)
    return jsonify({"ok": False, "message": "Endpoint not found"}), 404


@app.errorhandler(500)
def handle_internal_error(error):
    """Handle internal server errors."""
    logger.error("internal_server_error", error=str(error), exc_info=True)
    return jsonify({"ok": False, "message": "Internal server error"}), 500


@app.get("/")
def index():
    """API root endpoint."""
    logger.info("api_index_accessed", client_ip=request.remote_addr)
    return jsonify(
        {
            "ok": True,
            "message": "GhostShip API is running",
            "frontend_url": "http://127.0.0.1:5173",
            "endpoints": ["/api/health", "/api/analyze", "/api/analyze-documents", "/api/officer-profile"],
            "version": "1.0.0",
        }
    )


@app.get("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({
        "ok": True,
        "message": "GhostShip API available",
        "status": "healthy"
    })


@app.get("/api/officer-profile")
def get_officer_profile():
    """Get officer profile."""
    logger.info("officer_profile_retrieved")
    return jsonify({"ok": True, "profile": _get_profile()})


@app.post("/api/officer-profile")
def update_officer_profile():
    """Update officer profile with photo upload support."""
    try:
        form = request.form
        photo = request.files.get("photo")
        current_profile = _get_profile()
        photo_filename = current_profile["photo_url"].split("/")[-1] if current_profile.get("photo_url") else None

        if photo and photo.filename:
            # Validate photo size
            _validate_file_size(photo, 5 * 1024 * 1024, photo.filename)  # 5MB limit
            
            safe_name = secure_filename(photo.filename)
            suffix = Path(safe_name).suffix.lower()
            if suffix not in {'.png', '.jpg', '.jpeg', '.webp'}:
                return jsonify({"ok": False, "message": "Photo must be PNG, JPG, or WebP"}), 400
            
            stored_name = f"officer_profile{suffix}"
            photo.save(UPLOAD_DIR / stored_name)
            photo_filename = stored_name
            logger.info("officer_photo_uploaded", filename=stored_name)

        updated = {
            "full_name": (form.get("full_name") or current_profile["full_name"]).strip(),
            "role_title": (form.get("role_title") or current_profile["role_title"]).strip(),
            "badge_id": (form.get("badge_id") or current_profile["badge_id"]).strip(),
            "email": (form.get("email") or current_profile["email"]).strip(),
            "terminal": (form.get("terminal") or current_profile["terminal"]).strip(),
            "shift_name": (form.get("shift_name") or current_profile["shift_name"]).strip(),
            "photo_path": photo_filename,
        }

        with _db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE officer_profiles
                    SET full_name = %s, role_title = %s, badge_id = %s, 
                        email = %s, terminal = %s, shift_name = %s, photo_path = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1
                    """,
                    (
                        updated["full_name"],
                        updated["role_title"],
                        updated["badge_id"],
                        updated["email"],
                        updated["terminal"],
                        updated["shift_name"],
                        updated["photo_path"],
                    ),
                )
            connection.commit()

        logger.info("officer_profile_updated", badge_id=updated["badge_id"])
        return jsonify({"ok": True, "profile": _get_profile()})
        
    except ValueError as e:
        logger.warning("officer_profile_validation_failed", error=str(e))
        return jsonify({"ok": False, "message": str(e)}), 400
    except Exception as e:
        logger.error("officer_profile_update_failed", error=str(e))
        return jsonify({"ok": False, "message": "Failed to update profile"}), 500


@app.get("/uploads/officers/<path:filename>")
def uploaded_officer_photo(filename):
    """Serve uploaded officer photos."""
    # Security: prevent directory traversal
    safe_filename = secure_filename(filename)
    if safe_filename != filename:
        logger.warning("blocked_directory_traversal", original=filename, sanitized=safe_filename)
        return jsonify({"ok": False, "message": "Invalid filename"}), 400
    
    return send_from_directory(UPLOAD_DIR, safe_filename)


@app.post("/api/analyze")
def analyze_csv():
    """Analyze CSV shipment data."""
    logger.info("csv_analysis_requested")
    
    if "file" not in request.files:
        logger.warning("csv_analysis_no_file")
        return jsonify({"ok": False, "message": "CSV file is required"}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        logger.warning("csv_analysis_empty_filename")
        return jsonify({"ok": False, "message": "No file selected"}), 400

    try:
        # Validate file size
        file_size = _validate_file_size(uploaded_file, MAX_CSV_SIZE, uploaded_file.filename)
        logger.info("csv_file_received", filename=uploaded_file.filename, size_bytes=file_size)
        
        # Parse settings
        raw_settings = request.form.get("settings")
        try:
            settings_data = json.loads(raw_settings) if raw_settings else {}
            settings = AnalysisSettings(**settings_data)
            normalized_settings = normalize_analysis_settings(settings.model_dump())
        except json.JSONDecodeError as error:
            logger.warning("csv_analysis_invalid_settings", error=str(error))
            return jsonify({"ok": False, "message": f"Invalid analysis settings: {error}"}), 400
        except Exception as error:
            logger.warning("csv_analysis_settings_validation_failed", error=str(error))
            return jsonify({"ok": False, "message": f"Invalid settings: {error}"}), 400

        # Parse CSV
        try:
            dataframe = pd.read_csv(BytesIO(uploaded_file.read()))
        except Exception as error:
            logger.warning("csv_analysis_parse_failed", error=str(error))
            return jsonify({"ok": False, "message": f"Could not read CSV: {error}"}), 400

        if len(dataframe) == 0:
            logger.warning("csv_analysis_empty_file")
            return jsonify({"ok": False, "message": "CSV file is empty"}), 400
        
        if len(dataframe) > 10000:
            logger.warning("csv_analysis_too_many_rows", rows=len(dataframe))
            return jsonify({"ok": False, "message": "CSV exceeds maximum of 10,000 rows"}), 400

        records = _normalize_records(dataframe)
        if not records:
            logger.warning("csv_analysis_no_records")
            return jsonify({"ok": False, "message": "Uploaded CSV has no shipment rows"}), 400

        logger.info("csv_analysis_processing", rows=len(records))
        
        try:
            analysis = summarize_shipments(records, settings=normalized_settings)
        except ShipmentValidationError as error:
            logger.warning("csv_analysis_validation_error", error=str(error))
            return jsonify({"ok": False, "message": f"Validation error: {error}"}), 400
        except Exception as error:
            logger.error("csv_analysis_failed", error=str(error), exc_info=True)
            return jsonify({"ok": False, "message": f"Analysis failed: {error}"}), 500

        logger.info("csv_analysis_completed", 
                   rows_processed=len(records),
                   high_risk=analysis.get("summary", {}).get("high_risk_alerts", 0))
        
        return jsonify(
            {
                "ok": True,
                "file_name": uploaded_file.filename,
                "rows_processed": len(records),
                **analysis,
            }
        )
        
    except ValueError as error:
        logger.warning("csv_analysis_file_error", error=str(error))
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        logger.error("csv_analysis_unexpected_error", error=str(error), exc_info=True)
        return jsonify({"ok": False, "message": "Unexpected error occurred"}), 500


@app.post("/api/analyze-documents")
def analyze_documents():
    """Analyze uploaded document set."""
    logger.info("document_analysis_requested")
    
    missing = [field for field in DOCUMENT_FIELDS if field not in request.files]
    if missing:
        logger.warning("document_analysis_missing_files", missing=missing)
        return (
            jsonify(
                {
                    "ok": False,
                    "message": "Required documents missing: " + ", ".join(
                        field.replace("_", " ") for field in missing
                    ),
                }
            ),
            400,
        )

    try:
        # Validate all files
        files = {}
        for field in DOCUMENT_FIELDS:
            file_storage = request.files[field]
            if not file_storage.filename:
                logger.warning("document_analysis_empty_file", field=field)
                return jsonify({"ok": False, "message": f"Empty file uploaded for {field}"}), 400
            
            size = _validate_file_size(file_storage, DOCUMENT_MAX_SIZE, file_storage.filename)
            files[field] = file_storage
            logger.info("document_received", field=field, filename=file_storage.filename, size=size)

        analysis = analyze_document_set(files)
        logger.info("document_analysis_completed", 
                   risk_score=analysis.get("top_result", {}).get("risk_score"),
                   status=analysis.get("top_result", {}).get("status"))
        
        return jsonify(analysis)
        
    except DocumentProcessingError as error:
        logger.warning("document_processing_error", error=str(error))
        return jsonify({"ok": False, "message": str(error)}), 400
    except ValueError as error:
        logger.warning("document_validation_error", error=str(error))
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        logger.error("document_analysis_failed", error=str(error), exc_info=True)
        return jsonify({"ok": False, "message": f"Document analysis failed: {error}"}), 500


if __name__ == "__main__":
    logger.info("starting_ghostship_api", host="127.0.0.1", port=5000)
    app.run(host="127.0.0.1", port=5000, debug=False)
