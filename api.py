from io import BytesIO

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from document_analysis import DocumentProcessingError, analyze_document_set
from main import summarize_shipments

app = Flask(__name__)
CORS(app)


DOCUMENT_FIELDS = ("invoice", "packing_list", "bill_of_lading")


def _normalize_records(dataframe):
    return dataframe.where(pd.notnull(dataframe), None).to_dict(orient="records")


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


@app.post("/api/analyze")
def analyze_csv():
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "CSV file is required"}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"ok": False, "message": "No file selected"}), 400

    try:
        dataframe = pd.read_csv(BytesIO(uploaded_file.read()))
    except Exception as error:
        return jsonify({"ok": False, "message": f"Could not read CSV: {error}"}), 400

    records = _normalize_records(dataframe)
    if not records:
        return jsonify({"ok": False, "message": "Uploaded CSV has no shipment rows"}), 400

    try:
        analysis = summarize_shipments(records)
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
