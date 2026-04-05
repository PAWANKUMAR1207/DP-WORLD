"""GhostShip API with validation, logging, and security."""

import json
import os
import structlog
from io import BytesIO
from pathlib import Path
import sqlite3

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

try:
    import pymysql
    from pymysql.cursors import DictCursor
except ImportError:  # pragma: no cover - optional until installed
    pymysql = None
    DictCursor = None

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

load_dotenv()

app = Flask(__name__)

# File size limits (in bytes)
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB for documents
MAX_CSV_SIZE = 10 * 1024 * 1024  # 10MB for CSV files
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# CORS configuration - manual handler, reliable across all flask-cors versions
_allowed_origins = set(os.getenv(
    "ALLOWED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,https://dp-world-svv2.onrender.com,https://hue-overlively-heide.ngrok-free.dev",
).split(","))

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin in _allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, ngrok-skip-browser-warning"
    response.headers["Access-Control-Max-Age"] = "3600"
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        resp = app.make_default_options_response()
        return add_cors_headers(resp)

# Document fields configuration
DOCUMENT_FIELDS = ("invoice", "packing_list", "bill_of_lading")
DOCUMENT_MAX_SIZE = 10 * 1024 * 1024  # 10MB per document

DEFAULT_AUDIT_QUEUE = [
    {"shipment_id": "CONT-GS-3003", "stage": "Pending Review", "owner": "Control Desk", "eta": "10 min", "priority": "HIGH", "notes": ""},
    {"shipment_id": "CONT-GS-2002", "stage": "Secondary Inspection", "owner": "Bay 2", "eta": "22 min", "priority": "MEDIUM", "notes": ""},
    {"shipment_id": "CONT-GS-1001", "stage": "Cleared", "owner": "Gate Ops", "eta": "Released", "priority": "LOW", "notes": ""},
]

DEFAULT_SANCTIONS_ENTITIES = [
    {
        "name": "Huawei Technologies Co., Ltd.",
        "country": "China",
        "authority": "OFAC / BIS",
        "date_added": "2019-05-16",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Technology / Telecommunications",
        "reason": "Export control violations, national security concerns",
    },
    {
        "name": "Wagner Group (PMC)",
        "country": "Russia",
        "authority": "OFAC / EU / UN",
        "date_added": "2017-06-20",
        "risk_tier": "Critical",
        "policy_level": "Blacklisted",
        "category": "Private Military Company",
        "reason": "Conflict minerals, human rights abuses, destabilization activities",
    },
    {
        "name": "Islamic Republic of Iran Shipping Lines (IRISL)",
        "country": "Iran",
        "authority": "OFAC / EU",
        "date_added": "2020-06-08",
        "risk_tier": "Critical",
        "policy_level": "Blacklisted",
        "category": "Maritime / Shipping",
        "reason": "Proliferation activities, sanctions evasion",
    },
    {
        "name": "Ocean Maritime Management Co., Ltd.",
        "country": "North Korea",
        "authority": "UN / OFAC",
        "date_added": "2014-07-28",
        "risk_tier": "Critical",
        "policy_level": "Blacklisted",
        "category": "Maritime / Shipping",
        "reason": "Arms smuggling, UN sanctions violations",
    },
    {
        "name": "Sovcomflot PJSC",
        "country": "Russia",
        "authority": "OFAC / UK / EU",
        "date_added": "2022-02-24",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Oil & Gas Shipping",
        "reason": "Russian energy sector, war in Ukraine",
    },
    {
        "name": "Dalian Ocean Fishing Co., Ltd.",
        "country": "China",
        "authority": "CBP / NOAA",
        "date_added": "2021-05-28",
        "risk_tier": "Medium",
        "policy_level": "Watchlist",
        "category": "Fishing / IUU",
        "reason": "Forced labor, illegal fishing (IUU), human rights abuses",
    },
    {
        "name": "Cosco Shipping Tanker (Dalian)",
        "country": "China",
        "authority": "OFAC",
        "date_added": "2019-09-25",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Oil Shipping",
        "reason": "Iranian oil trade, sanctions evasion",
    },
    {
        "name": "Korea Shipbuilding & Offshore Engineering",
        "country": "South Korea",
        "authority": "BIS",
        "date_added": "2023-04-12",
        "risk_tier": "Medium",
        "policy_level": "Watchlist",
        "category": "Shipbuilding",
        "reason": "Technology diversion to sanctioned entities",
    },
    {
        "name": "Port of Sevastopol",
        "country": "Crimea",
        "authority": "OFAC / EU / UK",
        "date_added": "2014-12-19",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Port Authority",
        "reason": "Annexation of Crimea, Russian occupation",
    },
    {
        "name": "Hennesea Holdings Limited",
        "country": "UAE / Hong Kong",
        "authority": "OFAC",
        "date_added": "2023-03-02",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Shipping / Logistics",
        "reason": "Russian oil price cap violations",
    },
    {
        "name": "Star Petroleum Refining Public Co.",
        "country": "Thailand",
        "authority": "OFAC",
        "date_added": "2023-08-08",
        "risk_tier": "Medium",
        "policy_level": "Watchlist",
        "category": "Petroleum Refining",
        "reason": "Iranian oil purchases, sanctions evasion",
    },
    {
        "name": "Rosnefteflot JSC",
        "country": "Russia",
        "authority": "OFAC / EU",
        "date_added": "2022-02-24",
        "risk_tier": "High",
        "policy_level": "Inspection First",
        "category": "Tanker Fleet",
        "reason": "Rosneft subsidiary, Russian energy exports",
    },
]

DEFAULT_MANAGER_ACCOUNT = {
    "user_id": "manager01",
    "password": "manager123",
    "full_name": "Pawan Kumar",
    "email": "pawan.kumar@ghostship.local",
    "phone": "+91 98765 43210",
    "role_title": "Customs Manager",
    "badge_id": "CM-4172",
    "department": "Customs Risk Office",
    "terminal": "Terminal 4",
    "shift_name": "Morning Shift",
}

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "ghostship.db"
UPLOAD_DIR = BASE_DIR / "uploads" / "officers"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DB_TYPE = os.getenv("DB_TYPE", "sqlite").strip().lower()
DB_HOST = os.getenv("DB_HOST", "127.0.0.1").strip()
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "").strip()
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "ghostship").strip() or "ghostship"
_MYSQL_BOOTSTRAPPED = False

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


def _is_mysql():
    return DB_TYPE == "mysql"


def _placeholder_sql(query):
    if not _is_mysql():
        return query
    return query.replace("?", "%s")


def _mysql_server_connection():
    if pymysql is None:
        raise RuntimeError("PyMySQL is required for MySQL support. Install dependencies first.")
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        cursorclass=DictCursor,
        autocommit=False,
    )


def _ensure_mysql_database():
    global _MYSQL_BOOTSTRAPPED
    if not _is_mysql() or _MYSQL_BOOTSTRAPPED:
        return

    with _mysql_server_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        connection.commit()
    _MYSQL_BOOTSTRAPPED = True


def _db_connection():
    """Get database connection with row factory/dict cursor."""
    if _is_mysql():
        _ensure_mysql_database()
        return pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=DictCursor,
            autocommit=False,
        )

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _execute(connection, query, params=()):
    return connection.execute(_placeholder_sql(query), params)


def _executemany(connection, query, params):
    return connection.executemany(_placeholder_sql(query), params)


def _fetchone(connection, query, params=()):
    cursor = _execute(connection, query, params)
    return cursor.fetchone()


def _fetchall(connection, query, params=()):
    cursor = _execute(connection, query, params)
    return cursor.fetchall()


def _ensure_column(connection, table_name, column_name, add_sql):
    try:
        _execute(connection, add_sql)
    except Exception as error:  # pragma: no cover - depends on existing DB state
        message = str(error).lower()
        if "duplicate column" in message or "already exists" in message:
            return
        raise


def _init_db():
    """Initialize database with officer profile table."""
    with _db_connection() as connection:
        if _is_mysql():
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS officer_profiles (
                    id INT PRIMARY KEY,
                    full_name VARCHAR(255) NOT NULL,
                    role_title VARCHAR(255) NOT NULL,
                    badge_id VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    terminal VARCHAR(255),
                    shift_name VARCHAR(255),
                    photo_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                """,
            )
        else:
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS officer_profiles (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    full_name TEXT NOT NULL,
                    role_title TEXT NOT NULL,
                    badge_id TEXT NOT NULL,
                    email TEXT,
                    terminal TEXT,
                    shift_name TEXT,
                    photo_path TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
            )

        existing = _fetchone(connection, "SELECT id FROM officer_profiles WHERE id = 1")
        if existing is None:
            _execute(
                connection,
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
            logger.info("initialized_default_officer_profile")

        if _is_mysql():
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS audit_queue (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    shipment_id VARCHAR(255) NOT NULL,
                    stage VARCHAR(255) NOT NULL,
                    owner VARCHAR(255) NOT NULL,
                    eta VARCHAR(255) NOT NULL,
                    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                """,
            )
        else:
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS audit_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shipment_id TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    eta TEXT NOT NULL,
                    priority TEXT NOT NULL DEFAULT 'MEDIUM',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
            )

        existing_audit = _fetchone(connection, "SELECT COUNT(*) AS count FROM audit_queue")
        if existing_audit["count"] == 0:
            if _is_mysql():
                _executemany(
                    connection,
                    """
                    INSERT INTO audit_queue (shipment_id, stage, owner, eta, priority, notes)
                    VALUES (%(shipment_id)s, %(stage)s, %(owner)s, %(eta)s, %(priority)s, %(notes)s)
                    """,
                    DEFAULT_AUDIT_QUEUE,
                )
            else:
                _executemany(
                    connection,
                    """
                    INSERT INTO audit_queue (shipment_id, stage, owner, eta, priority, notes)
                    VALUES (:shipment_id, :stage, :owner, :eta, :priority, :notes)
                    """,
                    DEFAULT_AUDIT_QUEUE,
                )
            logger.info("initialized_default_audit_queue")

        if _is_mysql():
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS sanctions_watchlist (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(255) NOT NULL,
                    country VARCHAR(255) NOT NULL,
                    authority VARCHAR(255) NOT NULL,
                    date_added VARCHAR(32) NOT NULL,
                    risk_tier VARCHAR(32) NOT NULL,
                    policy_level VARCHAR(32) NOT NULL DEFAULT 'Watchlist',
                    category VARCHAR(255) NOT NULL,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                """,
            )
        else:
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS sanctions_watchlist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    country TEXT NOT NULL,
                    authority TEXT NOT NULL,
                    date_added TEXT NOT NULL,
                    risk_tier TEXT NOT NULL,
                    policy_level TEXT NOT NULL DEFAULT 'Watchlist',
                    category TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
            )

        if _is_mysql():
            _ensure_column(
                connection,
                "sanctions_watchlist",
                "policy_level",
                "ALTER TABLE sanctions_watchlist ADD COLUMN policy_level VARCHAR(32) NOT NULL DEFAULT 'Watchlist'",
            )
        else:
            _ensure_column(
                connection,
                "sanctions_watchlist",
                "policy_level",
                "ALTER TABLE sanctions_watchlist ADD COLUMN policy_level TEXT NOT NULL DEFAULT 'Watchlist'",
            )

        existing_entities = _fetchone(connection, "SELECT COUNT(*) AS count FROM sanctions_watchlist")
        if existing_entities["count"] == 0:
            if _is_mysql():
                _executemany(
                    connection,
                    """
                    INSERT INTO sanctions_watchlist (
                        name, country, authority, date_added, risk_tier, policy_level, category, reason
                    ) VALUES (
                        %(name)s, %(country)s, %(authority)s, %(date_added)s, %(risk_tier)s, %(policy_level)s, %(category)s, %(reason)s
                    )
                    """,
                    DEFAULT_SANCTIONS_ENTITIES,
                )
            else:
                _executemany(
                    connection,
                    """
                    INSERT INTO sanctions_watchlist (
                        name, country, authority, date_added, risk_tier, policy_level, category, reason
                    ) VALUES (
                        :name, :country, :authority, :date_added, :risk_tier, :policy_level, :category, :reason
                    )
                    """,
                    DEFAULT_SANCTIONS_ENTITIES,
                )
            logger.info("initialized_default_sanctions_watchlist")

        if _is_mysql():
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS customs_manager_users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    phone VARCHAR(64) NOT NULL,
                    role_title VARCHAR(255) NOT NULL,
                    badge_id VARCHAR(255) NOT NULL,
                    department VARCHAR(255) NOT NULL,
                    terminal VARCHAR(255) NOT NULL,
                    shift_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
                """,
            )
        else:
            _execute(
                connection,
                """
                CREATE TABLE IF NOT EXISTS customs_manager_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT NOT NULL,
                    role_title TEXT NOT NULL,
                    badge_id TEXT NOT NULL,
                    department TEXT NOT NULL,
                    terminal TEXT NOT NULL,
                    shift_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """,
            )

        existing_manager = _fetchone(connection, "SELECT COUNT(*) AS count FROM customs_manager_users")
        if existing_manager["count"] == 0:
            if _is_mysql():
                _execute(
                    connection,
                    """
                    INSERT INTO customs_manager_users (
                        user_id, password, full_name, email, phone, role_title, badge_id, department, terminal, shift_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_MANAGER_ACCOUNT["user_id"],
                        DEFAULT_MANAGER_ACCOUNT["password"],
                        DEFAULT_MANAGER_ACCOUNT["full_name"],
                        DEFAULT_MANAGER_ACCOUNT["email"],
                        DEFAULT_MANAGER_ACCOUNT["phone"],
                        DEFAULT_MANAGER_ACCOUNT["role_title"],
                        DEFAULT_MANAGER_ACCOUNT["badge_id"],
                        DEFAULT_MANAGER_ACCOUNT["department"],
                        DEFAULT_MANAGER_ACCOUNT["terminal"],
                        DEFAULT_MANAGER_ACCOUNT["shift_name"],
                    ),
                )
            else:
                _execute(
                    connection,
                    """
                    INSERT INTO customs_manager_users (
                        user_id, password, full_name, email, phone, role_title, badge_id, department, terminal, shift_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        DEFAULT_MANAGER_ACCOUNT["user_id"],
                        DEFAULT_MANAGER_ACCOUNT["password"],
                        DEFAULT_MANAGER_ACCOUNT["full_name"],
                        DEFAULT_MANAGER_ACCOUNT["email"],
                        DEFAULT_MANAGER_ACCOUNT["phone"],
                        DEFAULT_MANAGER_ACCOUNT["role_title"],
                        DEFAULT_MANAGER_ACCOUNT["badge_id"],
                        DEFAULT_MANAGER_ACCOUNT["department"],
                        DEFAULT_MANAGER_ACCOUNT["terminal"],
                        DEFAULT_MANAGER_ACCOUNT["shift_name"],
                    ),
                )
            logger.info("initialized_default_customs_manager_account", user_id=DEFAULT_MANAGER_ACCOUNT["user_id"])
        connection.commit()


def _serialize_profile(row):
    """Serialize officer profile from database row."""
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
    """Get officer profile from database, with fallback defaults."""
    try:
        with _db_connection() as connection:
            row = _fetchone(connection, "SELECT * FROM officer_profiles WHERE id = 1")
        if row:
            return _serialize_profile(row)
    except Exception:
        pass
    return {
        "full_name": "Officer A. Rahman",
        "role_title": "Customs Risk Officer",
        "badge_id": "CM-4172",
        "email": "arahman@ghostship.local",
        "terminal": "Terminal 4",
        "shift_name": "Morning Shift",
        "photo_url": None,
    }


def _serialize_audit_row(row):
    return {
        "id": row["id"],
        "shipmentId": row["shipment_id"],
        "stage": row["stage"],
        "owner": row["owner"],
        "eta": row["eta"],
        "priority": row["priority"],
        "notes": row["notes"] or "",
    }


def _serialize_sanctions_row(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "country": row["country"],
        "authority": row["authority"],
        "dateAdded": row["date_added"],
        "riskTier": row["risk_tier"],
        "policyLevel": row.get("policy_level", "Watchlist") if hasattr(row, "get") else row["policy_level"],
        "category": row["category"],
        "reason": row["reason"],
    }


def _serialize_manager_user(row):
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "phone": row["phone"],
        "role_title": row["role_title"],
        "badge_id": row["badge_id"],
        "department": row["department"],
        "terminal": row["terminal"],
        "shift_name": row["shift_name"],
    }


def _normalize_text(value, fallback=""):
    return str(value or fallback).strip()


def _validate_audit_payload(payload):
    shipment_id = _normalize_text(payload.get("shipmentId"))
    stage = _normalize_text(payload.get("stage"))
    owner = _normalize_text(payload.get("owner"))
    eta = _normalize_text(payload.get("eta"))
    priority = _normalize_text(payload.get("priority"), "MEDIUM").upper()
    notes = _normalize_text(payload.get("notes"))

    if not shipment_id or not stage or not owner or not eta:
        raise ValueError("Shipment ID, stage, owner, and ETA are required")
    if priority not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        priority = "MEDIUM"

    return {
        "shipment_id": shipment_id,
        "stage": stage,
        "owner": owner,
        "eta": eta,
        "priority": priority,
        "notes": notes,
    }


def _validate_sanctions_payload(payload):
    name = _normalize_text(payload.get("name"))
    country = _normalize_text(payload.get("country"))
    authority = _normalize_text(payload.get("authority"))
    date_added = _normalize_text(payload.get("dateAdded"))
    risk_tier = _normalize_text(payload.get("riskTier"), "Medium").title()
    policy_level = _normalize_text(payload.get("policyLevel"), "Watchlist").title()
    category = _normalize_text(payload.get("category"))
    reason = _normalize_text(payload.get("reason"))

    if not name:
        raise ValueError("Entity name is required")
    if not date_added:
        raise ValueError("Date added is required")
    if risk_tier not in {"Critical", "High", "Medium", "Low"}:
        risk_tier = "Medium"
    if policy_level not in {"Watchlist", "Inspection First", "Blacklisted"}:
        policy_level = "Watchlist"

    return {
        "name": name,
        "country": country or "Unknown",
        "authority": authority or "Unknown",
        "date_added": date_added,
        "risk_tier": risk_tier,
        "policy_level": policy_level,
        "category": category or "Uncategorized",
        "reason": reason or "No reason recorded",
    }


def _normalize_match_key(value):
    characters = []
    for char in str(value or "").lower():
        if char.isalnum():
            characters.append(char)
        elif char.isspace():
            characters.append(" ")
    return " ".join("".join(characters).split())


def _get_company_name(shipment):
    return (
        shipment.get("company_name")
        or shipment.get("company")
        or shipment.get("company_id")
        or shipment.get("importer_name")
        or shipment.get("exporter_name")
        or shipment.get("consignee_name")
        or ""
    )


def _classification_rank(level):
    return {"LOW": 0, "MEDIUM": 1, "HIGH": 2}.get(str(level or "").upper(), 0)


def _classification_from_score(score, settings):
    low_risk = int(settings.get("low_risk_max", 30))
    medium_risk = int(settings.get("medium_risk_max", 70))
    if score <= low_risk:
        return "LOW", "Direct clearance"
    if score <= medium_risk:
        return "MEDIUM", "Secondary inspection"
    return "HIGH", "Full inspection"


def _policy_parameters(policy_level):
    normalized = str(policy_level or "Watchlist").title()
    if normalized == "Blacklisted":
        return {
            "boost": 35,
            "minimum_score": 85,
            "minimum_classification": "HIGH",
            "action": "Full inspection",
            "tag": "MANUAL BLACKLIST",
        }
    if normalized == "Inspection First":
        return {
            "boost": 20,
            "minimum_score": 68,
            "minimum_classification": "MEDIUM",
            "action": "Secondary inspection",
            "tag": "INSPECTION FIRST",
        }
    return {
        "boost": 10,
        "minimum_score": 45,
        "minimum_classification": "MEDIUM",
        "action": "Secondary inspection",
        "tag": "WATCHLIST HIT",
    }


def _find_watchlist_match(company_name, entities):
    company_key = _normalize_match_key(company_name)
    if not company_key:
        return None

    exact_match = None
    partial_match = None
    for entity in entities:
        entity_key = entity["match_key"]
        if not entity_key:
            continue
        if company_key == entity_key:
            exact_match = entity
            break
        if entity_key in company_key or company_key in entity_key:
            partial_match = partial_match or entity
    return exact_match or partial_match


def _build_csv_anomalies(results):
    anomalies = []
    severity_rank = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

    for result in results:
        shipment_id = result.get("shipment_id", "Unknown")
        details = result.get("details") or {}
        for engine_name, engine_details in details.items():
            for key, value in engine_details.items():
                label = str(key).replace("_", " ").title()
                severity = result.get("classification", "LOW")
                anomalies.append(
                    {
                        "type": label,
                        "message": str(value),
                        "shipmentId": shipment_id,
                        "severity": severity,
                        "status": "Open" if severity != "LOW" else "Observed",
                        "timestamp": "Just now",
                        "engine": str(engine_name).title(),
                        "category": engine_name,
                    }
                )

    anomalies.sort(key=lambda item: severity_rank.get(item["severity"], 0), reverse=True)
    return anomalies[:12]


def _apply_company_policy_matches(analysis, shipments, settings, watchlist_rows):
    entities = []
    for row in watchlist_rows:
        entities.append(
            {
                "id": row["id"],
                "name": row["name"],
                "country": row["country"],
                "risk_tier": row["risk_tier"],
                "policy_level": row.get("policy_level", "Watchlist") if hasattr(row, "get") else row["policy_level"],
                "reason": row["reason"],
                "match_key": _normalize_match_key(row["name"]),
            }
        )

    if not entities:
        analysis["anomalies"] = _build_csv_anomalies(analysis.get("results", []))
        return analysis

    updated_results = []
    for result in analysis.get("results", []):
        shipment = next((item for item in shipments if item.get("shipment_id") == result.get("shipment_id")), {})
        company_name = _get_company_name(shipment)
        match = _find_watchlist_match(company_name, entities)
        if not match:
            updated_results.append(result)
            continue

        policy = _policy_parameters(match["policy_level"])
        boosted_score = max(
            int(result.get("risk_score", 0)) + policy["boost"],
            policy["minimum_score"],
        )
        boosted_score = min(boosted_score, 100)

        next_classification, next_action = _classification_from_score(boosted_score, settings)
        if _classification_rank(next_classification) < _classification_rank(policy["minimum_classification"]):
            next_classification = policy["minimum_classification"]
            next_action = policy["action"]
        else:
            next_action = policy["action"] if _classification_rank(next_classification) >= _classification_rank(policy["minimum_classification"]) else next_action

        result = {
            **result,
            "risk_score": boosted_score,
            "classification": next_classification,
            "action": next_action,
            "policy_match": {
                "entity_id": match["id"],
                "entity_name": match["name"],
                "country": match["country"],
                "risk_tier": match["risk_tier"],
                "policy_level": match["policy_level"],
                "reason": match["reason"],
                "company_name": company_name or "Unknown",
            },
            "details": {
                **(result.get("details") or {}),
                "compliance": {
                    "manual_blacklist": f"{match['policy_level']}: {match['name']} matched shipment company '{company_name or 'Unknown'}'",
                },
            },
        }

        breakdown = dict(result.get("engine_scores") or {})
        current_network = float(breakdown.get("network", 0))
        policy_score = {"Watchlist": 0.58, "Inspection First": 0.78, "Blacklisted": 0.96}.get(match["policy_level"], 0.58)
        breakdown["network"] = round(max(current_network, policy_score), 2)
        result["engine_scores"] = breakdown

        explanation = result.get("explanation", "").strip()
        policy_sentence = f"Manual company policy hit: {match['name']} is marked as {match['policy_level']}."
        result["explanation"] = f"{policy_sentence} {explanation}".strip()
        updated_results.append(result)

    if updated_results:
        analysis["results"] = updated_results

    counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for item in analysis.get("results", []):
        counts[item.get("classification", "LOW")] = counts.get(item.get("classification", "LOW"), 0) + 1

    top_result = max(analysis.get("results", []), key=lambda item: item.get("risk_score", 0))
    top_shipment = next((item for item in shipments if item.get("shipment_id") == top_result.get("shipment_id")), shipments[0] if shipments else {})

    tags = list(top_result.get("risk_tags") or [])
    if top_result.get("policy_match"):
        policy_tag = _policy_parameters(top_result["policy_match"]["policy_level"])["tag"]
        if policy_tag not in tags:
            tags.insert(0, policy_tag)
        entity_name = top_result["policy_match"]["entity_name"]
        entity_tag = f"ENTITY: {entity_name.upper()}"
        if entity_tag not in tags:
            tags.append(entity_tag)

    analysis["summary"] = {
        "total_shipments": len(shipments),
        "high_risk_alerts": counts.get("HIGH", 0),
        "medium_risk": counts.get("MEDIUM", 0),
        "cleared_shipments": counts.get("LOW", 0),
    }
    analysis["top_result"] = {
        "risk_score": top_result["risk_score"],
        "status": top_result["classification"],
        "recommended_action": top_result["action"],
        "engine_breakdown": {
            key.capitalize(): value for key, value in (top_result.get("engine_scores") or {}).items()
        },
        "explanation": top_result.get("explanation", ""),
        "risk_tags": tags,
        "policy_match": top_result.get("policy_match"),
        "shipment_details": {
            "commodity": top_shipment.get("commodity", "Unknown"),
            "company": _get_company_name(top_shipment) or "Unknown",
            "origin": top_shipment.get("declared_origin_country")
            or top_shipment.get("actual_origin_country")
            or "Unknown",
            "destination": top_shipment.get("destination_country")
            or top_shipment.get("destination_port")
            or top_shipment.get("port_of_discharge")
            or "Unknown",
            "quantity": top_shipment.get("invoice_quantity")
            or top_shipment.get("bol_quantity")
            or top_shipment.get("igm_quantity")
            or "Unknown",
            "value": top_shipment.get("invoice_value")
            or top_shipment.get("declared_value_usd")
            or top_shipment.get("igm_value")
            or "Unknown",
            "shipment_id": top_shipment.get("shipment_id", "N/A"),
        },
    }
    analysis["anomalies"] = _build_csv_anomalies(analysis.get("results", []))
    return analysis


def _validate_manager_registration(payload):
    user_id = _normalize_text(payload.get("user_id"))
    password = _normalize_text(payload.get("password"))
    full_name = _normalize_text(payload.get("full_name"))
    email = _normalize_text(payload.get("email"))
    phone = _normalize_text(payload.get("phone"))
    role_title = _normalize_text(payload.get("role_title"), "Customs Manager")
    badge_id = _normalize_text(payload.get("badge_id"))
    department = _normalize_text(payload.get("department"), "Customs Risk Office")
    terminal = _normalize_text(payload.get("terminal"))
    shift_name = _normalize_text(payload.get("shift_name"))

    if not all([user_id, password, full_name, email, phone, badge_id, terminal, shift_name]):
        raise ValueError("All registration fields are required")

    return {
        "user_id": user_id,
        "password": password,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "role_title": role_title,
        "badge_id": badge_id,
        "department": department,
        "terminal": terminal,
        "shift_name": shift_name,
    }


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
try:
    _init_db()
except Exception as _init_err:
    logger.warning("db_init_failed", error=str(_init_err))


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
            "endpoints": [
                "/api/health",
                "/api/analyze",
                "/api/analyze-documents",
                "/api/officer-profile",
                "/api/auth/register",
                "/api/auth/login",
                "/api/audit-queue",
                "/api/sanctions-watchlist",
            ],
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


_HARDCODED_USERS = {
    "manager01": {
        "id": 1,
        "user_id": "manager01",
        "password": "admin123",
        "full_name": "Pawan Kumar",
        "email": "pawan.kumar@dpworld.local",
        "phone": "+91 99999 99999",
        "role_title": "Customs Risk Officer",
        "badge_id": "CM-4172",
        "department": "Customs Risk Office",
        "terminal": "Terminal 4",
        "shift_name": "Morning Shift",
    },
    "manager02": {
        "id": 2,
        "user_id": "manager02",
        "password": "admin123",
        "full_name": "A. Rahman",
        "email": "a.rahman@dpworld.local",
        "phone": "+91 88888 88888",
        "role_title": "Senior Customs Officer",
        "badge_id": "CM-3091",
        "department": "Customs Risk Office",
        "terminal": "Terminal 2",
        "shift_name": "Evening Shift",
    },
}


@app.post("/api/auth/register")
def register_customs_manager():
    """Registration is disabled — use hardcoded accounts."""
    return jsonify({"ok": False, "message": "Registration is disabled. Use manager01 / admin123 or manager02 / admin123 to log in."}), 403


@app.post("/api/auth/login")
def login_customs_manager():
    """Login against hardcoded user accounts."""
    payload = request.get_json(silent=True) or {}
    user_id = _normalize_text(payload.get("user_id"))
    password = _normalize_text(payload.get("password"))

    if not user_id or not password:
        return jsonify({"ok": False, "message": "User ID and password are required"}), 400

    user = _HARDCODED_USERS.get(user_id)
    if user is None or user["password"] != password:
        return jsonify({"ok": False, "message": "Invalid user ID or password"}), 401

    return jsonify({
        "ok": True,
        "message": "Login successful",
        "user": _serialize_manager_user(user),
    })


@app.get("/api/officer-profile")
def get_officer_profile():
    """Get officer profile."""
    logger.info("officer_profile_retrieved")
    return jsonify({"ok": True, "profile": _get_profile()})


@app.get("/api/audit-queue")
def get_audit_queue():
    """Return persisted audit queue rows."""
    try:
        with _db_connection() as connection:
            rows = _fetchall(
                connection,
                "SELECT * FROM audit_queue ORDER BY CASE priority WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END DESC, updated_at DESC, id DESC"
            )
        return jsonify({"ok": True, "rows": [_serialize_audit_row(row) for row in rows]})
    except Exception:
        return jsonify({"ok": True, "rows": []})


@app.post("/api/audit-queue")
def create_audit_queue_row():
    """Create an audit queue row."""
    try:
        payload = request.get_json(silent=True) or {}
        row = _validate_audit_payload(payload)
        try:
            with _db_connection() as connection:
                cursor = _execute(
                    connection,
                    """
                    INSERT INTO audit_queue (shipment_id, stage, owner, eta, priority, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (row["shipment_id"], row["stage"], row["owner"], row["eta"], row["priority"], row["notes"]),
                )
                connection.commit()
                stored = _fetchone(connection, "SELECT * FROM audit_queue WHERE id = ?", (cursor.lastrowid,))
            return jsonify({"ok": True, "row": _serialize_audit_row(stored)}), 201
        except Exception:
            return jsonify({"ok": False, "message": "Database unavailable"}), 503
    except ValueError as error:
        return jsonify({"ok": False, "message": str(error)}), 400


@app.put("/api/audit-queue/<int:row_id>")
def update_audit_queue_row(row_id):
    """Update an audit queue row."""
    try:
        payload = request.get_json(silent=True) or {}
        row = _validate_audit_payload(payload)
        try:
            with _db_connection() as connection:
                existing = _fetchone(connection, "SELECT id FROM audit_queue WHERE id = ?", (row_id,))
                if existing is None:
                    return jsonify({"ok": False, "message": "Audit queue row not found"}), 404
                _execute(
                    connection,
                    """
                    UPDATE audit_queue
                    SET shipment_id = ?, stage = ?, owner = ?, eta = ?, priority = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (row["shipment_id"], row["stage"], row["owner"], row["eta"], row["priority"], row["notes"], row_id),
                )
                connection.commit()
                stored = _fetchone(connection, "SELECT * FROM audit_queue WHERE id = ?", (row_id,))
            return jsonify({"ok": True, "row": _serialize_audit_row(stored)})
        except Exception:
            return jsonify({"ok": False, "message": "Database unavailable"}), 503
    except ValueError as error:
        return jsonify({"ok": False, "message": str(error)}), 400


@app.delete("/api/audit-queue/<int:row_id>")
def delete_audit_queue_row(row_id):
    """Delete an audit queue row."""
    try:
        with _db_connection() as connection:
            cursor = _execute(connection, "DELETE FROM audit_queue WHERE id = ?", (row_id,))
            connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"ok": False, "message": "Audit queue row not found"}), 404
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"ok": False, "message": "Database unavailable"}), 503


@app.get("/api/sanctions-watchlist")
def get_sanctions_watchlist():
    """Return persisted sanctions watchlist entries."""
    try:
        with _db_connection() as connection:
            rows = _fetchall(
                connection,
                "SELECT * FROM sanctions_watchlist ORDER BY CASE policy_level WHEN 'Blacklisted' THEN 3 WHEN 'Inspection First' THEN 2 ELSE 1 END DESC, CASE risk_tier WHEN 'Critical' THEN 4 WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END DESC, date_added DESC, id DESC"
            )
        return jsonify({"ok": True, "entities": [_serialize_sanctions_row(row) for row in rows]})
    except Exception:
        return jsonify({"ok": True, "entities": []})


@app.post("/api/sanctions-watchlist")
def create_sanctions_watchlist_entry():
    """Create a sanctions watchlist entry."""
    try:
        payload = request.get_json(silent=True) or {}
        entity = _validate_sanctions_payload(payload)
        with _db_connection() as connection:
            cursor = _execute(
                connection,
                """
                INSERT INTO sanctions_watchlist (
                    name, country, authority, date_added, risk_tier, policy_level, category, reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entity["name"],
                    entity["country"],
                    entity["authority"],
                    entity["date_added"],
                    entity["risk_tier"],
                    entity["policy_level"],
                    entity["category"],
                    entity["reason"],
                ),
            )
            connection.commit()
            stored = _fetchone(connection, "SELECT * FROM sanctions_watchlist WHERE id = ?", (cursor.lastrowid,))
        return jsonify({"ok": True, "entity": _serialize_sanctions_row(stored)}), 201
    except ValueError as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception:
        return jsonify({"ok": False, "message": "Database unavailable"}), 503


@app.put("/api/sanctions-watchlist/<int:entity_id>")
def update_sanctions_watchlist_entry(entity_id):
    """Update a sanctions watchlist entry."""
    try:
        payload = request.get_json(silent=True) or {}
        entity = _validate_sanctions_payload(payload)
        with _db_connection() as connection:
            existing = _fetchone(connection, "SELECT id FROM sanctions_watchlist WHERE id = ?", (entity_id,))
            if existing is None:
                return jsonify({"ok": False, "message": "Sanctions entity not found"}), 404
            _execute(
                connection,
                """
                UPDATE sanctions_watchlist
                SET name = ?, country = ?, authority = ?, date_added = ?, risk_tier = ?, policy_level = ?, category = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    entity["name"],
                    entity["country"],
                    entity["authority"],
                    entity["date_added"],
                    entity["risk_tier"],
                    entity["policy_level"],
                    entity["category"],
                    entity["reason"],
                    entity_id,
                ),
            )
            connection.commit()
            stored = _fetchone(connection, "SELECT * FROM sanctions_watchlist WHERE id = ?", (entity_id,))
        return jsonify({"ok": True, "entity": _serialize_sanctions_row(stored)})
    except ValueError as error:
        return jsonify({"ok": False, "message": str(error)}), 400
    except Exception:
        return jsonify({"ok": False, "message": "Database unavailable"}), 503


@app.delete("/api/sanctions-watchlist/<int:entity_id>")
def delete_sanctions_watchlist_entry(entity_id):
    """Delete a sanctions watchlist entry."""
    try:
        with _db_connection() as connection:
            cursor = _execute(connection, "DELETE FROM sanctions_watchlist WHERE id = ?", (entity_id,))
            connection.commit()
        if cursor.rowcount == 0:
            return jsonify({"ok": False, "message": "Sanctions entity not found"}), 404
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"ok": False, "message": "Database unavailable"}), 503


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

        try:
            with _db_connection() as connection:
                _execute(
                    connection,
                    """
                    UPDATE officer_profiles
                    SET full_name = ?, role_title = ?, badge_id = ?,
                        email = ?, terminal = ?, shift_name = ?, photo_path = ?,
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
        except Exception:
            pass  # DB unavailable, return updated profile from memory anyway

        logger.info("officer_profile_updated", badge_id=updated["badge_id"])
        return jsonify({"ok": True, "profile": updated})

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

        try:
            with _db_connection() as connection:
                watchlist_rows = _fetchall(connection, "SELECT * FROM sanctions_watchlist")
        except Exception:
            watchlist_rows = []
        analysis = _apply_company_policy_matches(analysis, records, normalized_settings, watchlist_rows)

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


@app.post("/api/send-report")
def send_report():
    """Send analysis summary report via Gmail."""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    data = request.get_json(silent=True) or {}
    to_email = data.get("to_email", "").strip()
    subject = data.get("subject", "GhostShip — Analysis Report")
    analysis = data.get("analysis", {})
    results = data.get("results", [])

    if not to_email:
        return jsonify({"ok": False, "message": "Recipient email is required"}), 400

    gmail_user = os.getenv("GMAIL_USER", "")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD", "")
    if not gmail_user or not gmail_password:
        return jsonify({"ok": False, "message": "Email credentials not configured on server"}), 500

    # Build HTML email body
    risk_score = analysis.get("riskScore", 0)
    status = analysis.get("status", "UNKNOWN")
    action = analysis.get("recommendedAction", "N/A")
    explanation = analysis.get("explanation", "")
    shipment = analysis.get("shipmentDetails", {})
    risk_factors = analysis.get("riskFactors", [])

    status_color = {"HIGH": "#ef4444", "MEDIUM": "#f97316", "LOW": "#22c55e"}.get(status, "#64748b")

    factors_html = "".join(f"<li style='margin:4px 0;color:#374151'>{f}</li>" for f in risk_factors)
    results_rows = "".join(
        f"""<tr>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb'>{r.get('shipment_id','—')}</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb'>{r.get('risk_score',0)}</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb'>{r.get('classification','—')}</td>
          <td style='padding:8px 12px;border-bottom:1px solid #e5e7eb'>{r.get('action','—')}</td>
        </tr>"""
        for r in results[:20]
    )

    html = f"""
    <html><body style='font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0'>
    <div style='max-width:680px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>
      <div style='background:#0f172a;padding:28px 32px'>
        <p style='margin:0;color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase'>GhostShip Port Intelligence</p>
        <h1 style='margin:8px 0 0;color:#fff;font-size:22px'>Analysis Report</h1>
      </div>

      <div style='padding:28px 32px'>
        <div style='display:flex;align-items:center;gap:16px;background:#f1f5f9;border-radius:12px;padding:20px'>
          <div style='background:{status_color};color:#fff;border-radius:50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0'>{risk_score}</div>
          <div>
            <p style='margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px'>Risk Status</p>
            <p style='margin:4px 0 0;font-size:20px;font-weight:700;color:{status_color}'>{status}</p>
            <p style='margin:4px 0 0;font-size:13px;color:#374151'>{action}</p>
          </div>
        </div>

        <p style='margin:20px 0 8px;color:#374151;font-size:14px;line-height:1.6'>{explanation}</p>

        <h2 style='font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px'>Shipment Details</h2>
        <table style='width:100%;border-collapse:collapse;font-size:13px'>
          {''.join(f"<tr><td style='padding:6px 0;color:#64748b;width:40%'>{k.replace('_',' ').title()}</td><td style='padding:6px 0;color:#0f172a;font-weight:600'>{v}</td></tr>" for k, v in shipment.items() if v and v != 'Unknown')}
        </table>

        {"<h2 style='font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px'>Risk Factors</h2><ul style='margin:0;padding-left:20px'>" + factors_html + "</ul>" if risk_factors else ""}

        {"<h2 style='font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin:24px 0 12px'>Shipment Results</h2><table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr style='background:#f1f5f9'><th style='padding:10px 12px;text-align:left;color:#374151'>Shipment ID</th><th style='padding:10px 12px;text-align:left;color:#374151'>Score</th><th style='padding:10px 12px;text-align:left;color:#374151'>Risk</th><th style='padding:10px 12px;text-align:left;color:#374151'>Action</th></tr></thead><tbody>" + results_rows + "</tbody></table>" if results else ""}
      </div>

      <div style='background:#f1f5f9;padding:16px 32px;text-align:center'>
        <p style='margin:0;font-size:11px;color:#94a3b8'>Sent from GhostShip Port Intelligence System · Confidential</p>
      </div>
    </div>
    </body></html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = gmail_user
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, to_email, msg.as_string())

        logger.info("report_email_sent", to=to_email)
        return jsonify({"ok": True, "message": f"Report sent to {to_email}"})

    except smtplib.SMTPAuthenticationError:
        return jsonify({"ok": False, "message": "Gmail authentication failed. Use an App Password, not your account password."}), 500
    except Exception as error:
        logger.error("email_send_failed", error=str(error))
        return jsonify({"ok": False, "message": f"Failed to send email: {error}"}), 500


if __name__ == "__main__":
    logger.info("starting_ghostship_api", host="127.0.0.1", port=5000)
    app.run(host="127.0.0.1", port=5000, debug=False)
