import { useState } from "react";
import { Mail, X, Send, CheckCircle, AlertCircle, Loader } from "lucide-react";
import API_BASE from "../utils/config";
import { generateReportPDF } from "../utils/generateReportPDF";

export default function EmailReportModal({ analysis, results, officerProfile, onClose }) {
  const [toEmail, setToEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | sending | success | error
  const [message, setMessage] = useState("");

  async function handleSend() {
    if (!toEmail.trim() || !toEmail.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    try {
      // Step 1: generate PDF bytes client-side
      setStatus("generating");
      const pdfBuffer = generateReportPDF(analysis, results, officerProfile, true);
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });
      const fileName = `GhostShip_Report_${analysis?.shipmentDetails?.shipmentId || "EXPORT"}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Step 2: send as multipart with PDF attached
      setStatus("sending");
      const formData = new FormData();
      formData.append("to_email", toEmail.trim());
      formData.append("subject", `GhostShip Report — ${analysis?.status || "UNKNOWN"} Risk (Score: ${analysis?.riskScore ?? 0})`);
      formData.append("analysis", JSON.stringify(analysis));
      formData.append("results", JSON.stringify(results));
      formData.append("pdf", pdfBlob, fileName);

      const res = await fetch(`${API_BASE}/api/send-report`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Send failed");

      setStatus("success");
      setMessage(data.message);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Failed to send email.");
    }
  }

  const riskColor = {
    HIGH: "text-red-600",
    MEDIUM: "text-orange-500",
    LOW: "text-emerald-600",
  }[analysis?.status] || "text-slate-600";

  const statusLabel = {
    generating: "Generating PDF...",
    sending: "Sending email...",
  }[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Email Report</h2>
              <p className="text-sm text-slate-500">Sends analysis summary + PDF attachment</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Analysis preview */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Report contents</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {analysis?.shipmentDetails?.shipmentId || "Analysis Summary"}
            </p>
            <span className={`text-sm font-bold ${riskColor}`}>
              {analysis?.status} · {analysis?.riskScore ?? 0}/100
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{analysis?.recommendedAction}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-400">
            <span>PDF report attached</span>
            <span>·</span>
            <span>{results?.length ?? 0} shipment result{results?.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{analysis?.riskFactors?.length ?? 0} risk factors</span>
          </div>
        </div>

        {/* Email input */}
        {status !== "success" && (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recipient Email</span>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => { setToEmail(e.target.value); if (status === "error") { setStatus("idle"); setMessage(""); } }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="officer@port.local"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
                disabled={status === "generating" || status === "sending"}
              />
            </label>
          </div>
        )}

        {/* Status messages */}
        {message && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {status === "error"
              ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          {status === "success" ? (
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={status === "generating" || status === "sending"}
                className="flex-1 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={status === "generating" || status === "sending"}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
              >
                {statusLabel ? (
                  <><Loader className="h-4 w-4 animate-spin" /> {statusLabel}</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Report</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
