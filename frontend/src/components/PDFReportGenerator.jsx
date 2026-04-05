import { useState } from "react";
import { FileText, Download, Check } from "lucide-react";
import { generateReportPDF } from "../utils/generateReportPDF";

export default function PDFReportGenerator({ analysis, results, officerProfile, documentInsights }) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    generateReportPDF(analysis, results, officerProfile);
    setGenerating(false);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Documentation</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Generate Official Report</h2>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Generate a professional PDF report with officer details, analysis results, fraud detections, 
        and AI explanations. Ready for court or administrative proceedings.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{officerProfile?.full_name || "Officer"}</p>
          <p className="text-xs text-slate-500">Officer</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{analysis.shipmentDetails?.shipmentId || "Pending"}</p>
          <p className="text-xs text-slate-500">Shipment</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${analysis.riskScore > 70 ? 'text-red-600' : analysis.riskScore > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {analysis.riskScore}/100
          </p>
          <p className="text-xs text-slate-500">Risk Score</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString("en-IN")}</p>
          <p className="text-xs text-slate-500">Date</p>
        </div>
      </div>

      <button
        onClick={generatePDF}
        disabled={generating || analysis.shipmentDetails?.shipmentId === "Pending"}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
          generated
            ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
            : analysis.shipmentDetails?.shipmentId === "Pending"
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02] shadow-lg"
        }`}
      >
        {generating ? (
          <>
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating PDF...
          </>
        ) : generated ? (
          <>
            <Check className="h-5 w-5" />
            Report Downloaded!
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Download Official Report (PDF)
          </>
        )}
      </button>

      {analysis.shipmentDetails?.shipmentId === "Pending" && (
        <p className="text-sm text-amber-600 mt-3 text-center">
          ⚠️ Analyze a shipment first to generate a report
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>Report includes:</strong> Officer details, shipment information, risk assessment, 
          detection breakdown, anomalies list, and AI explanation.
          <br />
          <strong>Format:</strong> PDF, print-ready, court-admissible
        </p>
      </div>
    </section>
  );
}
