from io import BytesIO
import json
from pathlib import Path
import sqlite3

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from document_analysis import DocumentProcessingError, analyze_document_set
from main import normalize_analysis_settings, summarize_shipments

app = Flask(__name__)
CORS(app)


DOCUMENT_FIELDS = ("invoice", "packing_list", "bill_of_lading")
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ghostship.db"
UPLOAD_DIR = BASE_DIR / "uploads" / "officers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
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


def _db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _init_db():
    with _db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS officer_profiles (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                full_name TEXT NOT NULL,
                role_title TEXT NOT NULL,
                badge_id TEXT NOT NULL,
                email TEXT,
                terminal TEXT,
                shift_name TEXT,
                photo_path TEXT
            )
            """
        )
        existing = connection.execute("SELECT id FROM officer_profiles WHERE id = 1").fetchone()
        if existing is None:
            connection.execute(
                """
                INSERT INTO officer_profiles (
                    id, full_name, role_title, badge_id, email, terminal, shift_name, photo_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        connection.commit()


def _serialize_profile(row):
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
    with _db_connection() as connection:
        row = connection.execute("SELECT * FROM officer_profiles WHERE id = 1").fetchone()
    return _serialize_profile(row)


def _canonicalize_column_name(name):
    return "".join(ch for ch in str(name).strip().lower() if ch.isalnum())


def _normalize_dataframe_columns(dataframe):
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
    normalized = _normalize_dataframe_columns(dataframe)
    return normalized.where(pd.notnull(normalized), None).to_dict(orient="records")


_init_db()


@app.get("/")
def index():
    return jsonify(
        {
            "ok": True,
            "message": "GhostShip API is running",
            "frontend_url": "http://127.0.0.1:5173",
            "endpoints": ["/api/health", "/api/analyze", "/api/analyze-documents"],
        }
    )


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "message": "GhostShip API available"})


@app.get("/api/officer-profile")
def get_officer_profile():
    return jsonify({"ok": True, "profile": _get_profile()})


@app.post("/api/officer-profile")
def update_officer_profile():
    form = request.form
    photo = request.files.get("photo")
    current_profile = _get_profile()
    photo_filename = current_profile["photo_url"].split("/")[-1] if current_profile.get("photo_url") else None

    if photo and photo.filename:
        safe_name = secure_filename(photo.filename)
        suffix = Path(safe_name).suffix.lower()
        stored_name = f"officer_profile{suffix or '.png'}"
        photo.save(UPLOAD_DIR / stored_name)
        photo_filename = stored_name

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
        connection.execute(
            """
            UPDATE officer_profiles
            SET full_name = ?, role_title = ?, badge_id = ?, email = ?, terminal = ?, shift_name = ?, photo_path = ?
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

    return jsonify({"ok": True, "profile": _get_profile()})


@app.get("/uploads/officers/<path:filename>")
def uploaded_officer_photo(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.post("/api/analyze")
def analyze_csv():
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "CSV file is required"}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"ok": False, "message": "No file selected"}), 400

    raw_settings = request.form.get("settings")
    try:
        settings = normalize_analysis_settings(json.loads(raw_settings) if raw_settings else None)
    except json.JSONDecodeError as error:
        return jsonify({"ok": False, "message": f"Invalid analysis settings: {error}"}), 400

    try:
        dataframe = pd.read_csv(BytesIO(uploaded_file.read()))
    except Exception as error:
        return jsonify({"ok": False, "message": f"Could not read CSV: {error}"}), 400

    records = _normalize_records(dataframe)
    if not records:
        return jsonify({"ok": False, "message": "Uploaded CSV has no shipment rows"}), 400

    try:
        analysis = summarize_shipments(records, settings=settings)
    except Exception as error:
        return jsonify({"ok": False, "message": f"Analysis failed: {error}"}), 500

    return jsonify(
        {
            "ok": True,
            "file_name": uploaded_file.filename,
            "rows_processed": len(records),
            **analysis,
        }
    )


@app.post("/api/analyze-documents")
def analyze_documents():
    missing = [field for field in DOCUMENT_FIELDS if field not in request.files]
    if missing:
        return (
            jsonify(
                {
                    "ok": False,
                    "message": "Required documents missing: " + ", ".join(field.replace("_", " ") for field in missing),
                }
            ),
            400,
        )

    try:
        analysis = analyze_document_set({field: request.files[field] for field in DOCUMENT_FIELDS})
    except DocumentProcessingError as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception as error:
        return jsonify({"ok": False, "message": f"Document analysis failed: {error}"}), 500

    return jsonify(analysis)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
