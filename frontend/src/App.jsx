import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
  ChevronDown,
  Clock3,
  Container,
  Download,
  FileSearch,
  FileText,
  Gauge,
  Globe,
  Radar,
  ShieldCheck,
  Siren,
  Upload,
  UserCircle2,
} from "lucide-react";

const navItems = [
  { id: "operations", label: "Operations" },
  { id: "analysis", label: "Shipment Analysis" },
  { id: "monitoring", label: "Risk Monitoring" },
  { id: "audit", label: "Audit Queue" },
];

const documentFields = [
  { key: "invoice", label: "Commercial Invoice" },
  { key: "packing_list", label: "Packing List" },
  { key: "bill_of_lading", label: "Bill of Lading" },
];

const intakeModes = [
  { key: "documents", label: "3 Documents" },
  { key: "csv", label: "Single CSV" },
];

const defaultCsvSettings = {
  low_risk_max: 30,
  medium_risk_max: 70,
  quantity_mismatch_threshold: 0.05,
  value_mismatch_threshold: 0.05,
  density_threshold: 2000,
  banana_temperature_floor: 10,
};

const baseDashboardStats = [
  {
    title: "Total Shipments",
    value: "0",
    description: "No active uploads in the analysis queue",
    trend: "+0.0%",
    direction: "up",
    updated: "Just now",
    sparkline: [24, 26, 28, 27, 29, 31, 32],
  },
  {
    title: "Critical Clearance Flags",
    value: "0",
    description: "High-risk document sets requiring inspection",
    trend: "+0.0%",
    direction: "up",
    updated: "Just now",
    sparkline: [12, 12, 13, 13, 14, 14, 15],
  },
  {
    title: "Medium Risk Cases",
    value: "0",
    description: "Secondary review candidates in current queue",
    trend: "+0.0%",
    direction: "up",
    updated: "Just now",
    sparkline: [14, 14, 14, 15, 15, 15, 16],
  },
  {
    title: "Cleared Shipments",
    value: "0",
    description: "Document sets ready for direct processing",
    trend: "+0.0%",
    direction: "up",
    updated: "Just now",
    sparkline: [8, 9, 9, 10, 10, 11, 11],
  },
];

const defaultAnalysis = {
  riskScore: 0,
  confidenceScore: null,
  status: "LOW",
  recommendedAction: "Upload a document set to begin analysis",
  explanation:
    "GhostShip cross-checks invoice, packing list, and bill of lading data to detect fraud patterns, declaration mismatches, and physically implausible cargo conditions before arrival.",
  shipmentDetails: {
    shipmentId: "Pending",
    containerId: "Pending",
    commodity: "Awaiting documents",
    origin: "Unknown",
    destination: "Unknown",
    quantity: "Unknown",
    declaredValue: "Unknown",
    weight: "Unknown",
    volume: "Unknown",
    temperature: "Unknown",
  },
  engineBreakdown: {
    Physics: 0.22,
    Document: 0.58,
    Behavior: 0.1,
    Network: 0.05,
  },
  riskFactors: [
    "Upload invoice, packing list, and bill of lading to generate a live intelligence review.",
  ],
  riskTags: ["DOCUMENT ANALYSIS READY"],
  operationalImpact: {
    riskValue: "No active declaration under review",
    inspectionRequirement: "Awaiting shipment documents",
  },
  comparisonInsight: {
    declared: "Unknown",
    expected: "Upload documents to compare declared and expected ranges",
  },
};

const defaultResults = [
  {
    shipment_id: "Pending",
    classification: "LOW",
    risk_score: 0,
    action: "Awaiting document upload",
    explanation: defaultAnalysis.explanation,
    details: {},
  },
];

const defaultDocumentInsights = {
  invoice: {
    file_name: "No file selected",
    parsed_fields: {},
    text_excerpt: "Extracted text will appear here after document analysis.",
  },
  packing_list: {
    file_name: "No file selected",
    parsed_fields: {},
    text_excerpt: "Packing list data preview will appear here after analysis.",
  },
  bill_of_lading: {
    file_name: "No file selected",
    parsed_fields: {},
    text_excerpt: "Bill of lading text preview will appear here after analysis.",
  },
};

const systemStatus = [
  { label: "Document Engine", value: "Active" },
  { label: "Data Pipeline", value: "Running" },
  { label: "Alerts processed today", value: "128" },
  { label: "Last sync", value: "14:32 IST" },
];

const auditQueueRows = [
  { shipmentId: "CONT-GS-3003", stage: "Pending Review", owner: "Control Desk", eta: "10 min" },
  { shipmentId: "CONT-GS-2002", stage: "Secondary Inspection", owner: "Bay 2", eta: "22 min" },
  { shipmentId: "CONT-GS-1001", stage: "Cleared", owner: "Gate Ops", eta: "Released" },
];

function toPolyline(points) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function severityTone(status) {
  if (status === "HIGH") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "MEDIUM") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function mapBreakdown(breakdown) {
  return {
    Physics: breakdown?.Physics ?? breakdown?.physics ?? 0,
    Document: breakdown?.Document ?? breakdown?.document ?? 0,
    Behavior: breakdown?.Behavior ?? breakdown?.behavior ?? 0,
    Network: breakdown?.Network ?? breakdown?.network ?? 0,
  };
}

function deriveConfidence(engineBreakdown, fallback) {
  const max = Math.max(...Object.values(engineBreakdown));
  return fallback ?? Math.max(60, Math.min(97, Math.round(68 + max * 25)));
}

function deriveExpectedRange(valueText) {
  const numeric = Number(String(valueText).replace(/[^\d.]/g, ""));
  if (!numeric) {
    return { declared: valueText || "Unknown", expected: "Unavailable" };
  }
  const lower = Math.round(numeric * 1.22);
  const upper = Math.round(numeric * 1.58);
  return {
    declared: `USD ${numeric.toLocaleString()}`,
    expected: `USD ${lower.toLocaleString()} - USD ${upper.toLocaleString()}`,
  };
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `USD ${numeric.toLocaleString()}`;
}

function formatMetric(value, suffix) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return `${value} ${suffix}`;
}

function formatLooseValue(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  const hasFraction = Math.abs(numeric % 1) > 0.001;
  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

function deriveRiskTags(engineBreakdown, anomalies) {
  const tags = [];
  if (engineBreakdown.Document >= 0.35) tags.push("DOCUMENT FRAUD");
  if (engineBreakdown.Physics >= 0.35) tags.push("PHYSICAL IMPOSSIBILITY");
  if (anomalies.some((row) => row.type.toLowerCase().includes("missing"))) tags.push("DATA COMPLETENESS");
  return tags.length ? tags : ["CLEARANCE READY"];
}

function classifyRiskScore(score) {
  if (score <= 30) return "LOW";
  if (score <= 70) return "MEDIUM";
  return "HIGH";
}

function actionForStatus(status) {
  if (status === "LOW") return "Direct clearance";
  if (status === "MEDIUM") return "Secondary inspection";
  return "Full inspection";
}

function titleCaseEngine(engine) {
  return engine.charAt(0).toUpperCase() + engine.slice(1).toLowerCase();
}

function summarizeResult(result) {
  const score = Number(result.risk_score ?? 0);
  const status = classifyRiskScore(score);
  const detailMessages = Object.entries(result.details || {}).flatMap(([category, group]) =>
    Object.values(group || {}).map((message) => ({ category, message })),
  );

  if (!detailMessages.length) {
    return status === "LOW"
      ? "No significant anomalies detected. Shipment appears normal."
      : `Risk Score: ${score}/100. Review required based on model and rule-based scoring signals.`;
  }

  const uniqueMessages = [...new Set(detailMessages.map((item) => item.message))];
  return `Risk Score: ${score}/100. Key concerns: ${uniqueMessages.slice(0, 3).join("; ")}`;
}

function deriveEngineBadges(result) {
  const badges = [];
  const engineScores = result.engine_scores || {};
  const detailKeys = Object.keys(result.details || {});
  const candidates = [
    { key: "physics", label: "PHYS" },
    { key: "document", label: "DOC" },
    { key: "behavior", label: "BEHAV" },
    { key: "network", label: "NET" },
  ];

  candidates.forEach((candidate) => {
    const score = engineScores[candidate.key] ?? engineScores[titleCaseEngine(candidate.key)];
    if ((typeof score === "number" && score > 0.2) || detailKeys.includes(candidate.key)) {
      badges.push(candidate.label);
    }
  });

  return badges.length ? badges : ["DOC"];
}

function normalizeResult(result) {
  const score = Number(result.risk_score ?? 0);
  const status = result.classification || classifyRiskScore(score);
  return {
    ...result,
    classification: status,
    action: result.action || actionForStatus(status),
    summary: summarizeResult(result),
    engineBadges: deriveEngineBadges(result),
  };
}

function formatAuditTimestamp(value, index = 0) {
  if (value && !String(value).includes("ago")) return String(value);
  const date = new Date(Date.now() - index * 60000);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function engineLabelFromCategory(category) {
  if (category === "physics") return "PHYS";
  if (category === "document") return "DOC";
  if (category === "behavior") return "BEHAV";
  if (category === "network") return "NET";
  return "DOC";
}

function downloadAnalysisReport({ analysis, results, anomalyRows, intakeMode }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const shipmentId = analysis.shipmentDetails.shipmentId || analysis.shipmentDetails.containerId || "shipment";
  const payload = {
    generated_at: new Date().toISOString(),
    intake_mode: intakeMode,
    summary: {
      risk_score: analysis.riskScore,
      confidence_score: analysis.confidenceScore,
      status: analysis.status,
      recommended_action: analysis.recommendedAction,
      explanation: analysis.explanation,
      risk_tags: analysis.riskTags,
    },
    shipment_details: analysis.shipmentDetails,
    engine_breakdown: analysis.engineBreakdown,
    operational_impact: analysis.operationalImpact,
    comparison_insight: analysis.comparisonInsight,
    anomalies: anomalyRows,
    results,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `GhostShip_Result_${shipmentId}_${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function SelectorChip({ label }) {
  return (
    <button
      type="button"
      className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:scale-[1.01] hover:border-slate-300 md:flex"
    >
      <span>{label}</span>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function Navbar({ activeView, setActiveView }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold tracking-[0.2em] text-white shadow-sm">
            GS
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">GhostShip</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Port Intelligence System</h1>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition hover:scale-[1.01] ${
                activeView === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SelectorChip label="Terminal 4" />
          <SelectorChip label="Morning Shift" />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:scale-[1.01] hover:text-slate-900"
          >
            <UserCircle2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sparkline({ points }) {
  const polyline = toPolyline(points)
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${x},${(y / 100) * 40}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-10 w-28">
      <polyline
        fill="none"
        stroke="#0f4c81"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
    </svg>
  );
}

function StatCard({ card }) {
  const TrendIcon = card.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const trendTone =
    card.direction === "up"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : "text-amber-700 bg-amber-50 ring-amber-200";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] transition hover:scale-[1.01]">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{card.value}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${trendTone}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {card.trend}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{card.description}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <Sparkline points={card.sparkline} />
        <p className="text-xs text-slate-400">Last updated: {card.updated}</p>
      </div>
    </article>
  );
}
function AlertFeed({ alerts }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live Risk Alert Feed</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Recent Detection Events</h2>
        </div>
        <Bell className="h-5 w-5 text-slate-400" />
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <div key={`${alert.shipmentId}-${alert.message}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${
                    alert.severity === "HIGH"
                      ? "bg-red-50 text-red-600"
                      : alert.severity === "MEDIUM"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-sky-50 text-sky-600"
                  }`}
                >
                  {alert.severity === "HIGH" ? <Siren className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{alert.shipmentId}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${severityTone(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-xs text-slate-500">
                    {alert.origin} ? {alert.destination}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">{alert.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UploadBox({
  intakeMode,
  setIntakeMode,
  documents,
  csvFile,
  csvSettings,
  onCsvSettingChange,
  loading,
  error,
  onFileChange,
  onCsvChange,
  handleAnalyze,
}) {
  const ready = intakeMode === "documents" ? Object.values(documents).every(Boolean) : Boolean(csvFile);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document Intake</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {intakeMode === "documents" ? "Upload Shipment Document Set" : "Upload Shipment Manifest"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {intakeModes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setIntakeMode(mode.key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  intakeMode === mode.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            {intakeMode === "documents" ? "PDF / TXT / Image" : "CSV"}
          </span>
        </div>
      </div>

      {intakeMode === "documents" ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {documentFields.map((field) => (
            <label
              key={field.key}
              className="block min-w-0 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-6 transition hover:border-slate-400 hover:bg-white"
            >
              <input
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.tif,.tiff"
                className="hidden"
                onChange={(event) => onFileChange(field.key, event.target.files?.[0])}
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Upload className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-semibold text-slate-900">{field.label}</h3>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">Upload the supporting document for this shipment.</p>
                  <p className="mt-3 truncate text-sm font-medium text-slate-900">
                    {documents[field.key]?.name || "No file selected"}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block min-w-0 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-6 transition hover:border-slate-400 hover:bg-white">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => onCsvChange(event.target.files?.[0])}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Upload className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-semibold text-slate-900">Shipment CSV Manifest</h3>
                <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                  Upload your shipment manifest. We'll scan every row for fraud patterns.
                </p>
                <p className="mt-3 truncate text-sm font-medium text-slate-900">
                  {csvFile?.name || "Drop your CSV here, or click to browse"}
                </p>
              </div>
            </div>
          </label>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis Settings</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">CSV Risk Threshold Controls</h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Operator
              </span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Low risk max</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={csvSettings.low_risk_max}
                  onChange={(event) => onCsvSettingChange("low_risk_max", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Medium risk max</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={csvSettings.medium_risk_max}
                  onChange={(event) => onCsvSettingChange("medium_risk_max", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quantity mismatch threshold</span>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={csvSettings.quantity_mismatch_threshold}
                  onChange={(event) => onCsvSettingChange("quantity_mismatch_threshold", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Value mismatch threshold</span>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={csvSettings.value_mismatch_threshold}
                  onChange={(event) => onCsvSettingChange("value_mismatch_threshold", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Density threshold</span>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={csvSettings.density_threshold}
                  onChange={(event) => onCsvSettingChange("density_threshold", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Perishable Temperature Minimum</span>
                <input
                  type="number"
                  min="-20"
                  max="40"
                  step="1"
                  value={csvSettings.banana_temperature_floor}
                  onChange={(event) => onCsvSettingChange("banana_temperature_floor", event.target.value)}
                  className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 xl:max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {intakeMode === "documents"
              ? "Upload all three documents, then GhostShip will extract fields, compare declarations, and score cargo risk before arrival."
              : "1. Upload your CSV -> 2. We analyze all shipments -> 3. Review the riskiest ones first"}
          </p>
        </div>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={handleAnalyze}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        >
          {loading ? "Documents received. Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
    </section>
  );
}

function ShipmentDetails({ details, intakeMode }) {
  const entries =
    intakeMode === "csv"
      ? [
          ["Shipment ID", details.shipmentId],
          ...(details.containerId && details.containerId !== details.shipmentId ? [["Container ID", details.containerId]] : []),
          ["Commodity", details.commodity],
          ["Origin country", details.origin],
          ["Quantity", details.quantity],
          ["Declared Value", details.declaredValue],
          ["Data source", "CSV Manifest"],
        ]
      : [
          ["Container ID", details.containerId],
          ["Shipment ID", details.shipmentId],
          ["Commodity", details.commodity],
          ["Origin country", details.origin],
          ["Destination", details.destination],
          ["Quantity", details.quantity],
          ["Declared Value", details.declaredValue],
          ["Weight", details.weight],
          ["Volume", details.volume],
          ["Temperature", details.temperature],
        ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shipment Details</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {intakeMode === "csv" ? "Primary Flagged Shipment" : "Cross-Document Shipment View"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        {intakeMode === "csv"
          ? "Showing the highest-risk shipment identified from the uploaded manifest."
          : "Showing the normalized shipment record assembled from the uploaded document set."}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskGauge({ analysis }) {
  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference * (1 - analysis.riskScore / 100);
  const hasActiveAnalysis = analysis.shipmentDetails.shipmentId !== "Pending";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk Analysis</p>
          <div className="mt-5 flex flex-col items-center justify-center">
            <div className="relative">
              <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
                <circle cx="80" cy="80" r="58" stroke="#dbe4ef" strokeWidth="14" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  stroke={analysis.status === "HIGH" ? "#be123c" : analysis.status === "MEDIUM" ? "#b45309" : "#15803d"}
                  strokeWidth="14"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tracking-tight text-slate-950">
                  {hasActiveAnalysis ? analysis.riskScore : "--"}
                </span>
                <span className="text-sm font-medium text-slate-500">/ 100</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Confidence:{" "}
              <span className="font-semibold text-slate-900">
                {analysis.confidenceScore == null ? "--" : `${analysis.confidenceScore}%`}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recommended Action</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{analysis.recommendedAction}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.riskTags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flag Reasons</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {analysis.riskFactors.map((factor) => (
                <li key={factor} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 2xl:grid-cols-2">
            <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comparison Insight</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <p className="text-sm text-slate-500">Declared</p>
                  <p className="break-words text-base font-semibold text-slate-950">{analysis.comparisonInsight.declared}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expected range</p>
                  <p className="break-words text-base font-semibold text-slate-950">{analysis.comparisonInsight.expected}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Operational Impact</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <p className="text-sm text-slate-500">Risk value</p>
                  <p className="break-words text-base font-semibold text-slate-950">{analysis.operationalImpact.riskValue}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Inspection requirement</p>
                  <p className="break-words text-base font-semibold text-slate-950">{analysis.operationalImpact.inspectionRequirement}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnomalyTable({ rows, analysis }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flagged Anomalies</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Shipment Anomaly Log</h2>
        </div>
        <FileSearch className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mb-4 grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/80 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Shipment</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{analysis.shipmentDetails.shipmentId}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Company</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{analysis.shipmentDetails.company || "Unknown"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Route</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {analysis.shipmentDetails.origin} → {analysis.shipmentDetails.destination}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Commodity / Value</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {analysis.shipmentDetails.commodity} · {analysis.shipmentDetails.declaredValue}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="pb-2">Type</th>
              <th className="pb-2">Engine</th>
              <th className="pb-2">Severity</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.type}-${row.timestamp}-${index}`} className="rounded-2xl bg-slate-50">
                  <td className="rounded-l-2xl px-4 py-3 font-medium text-slate-900">{row.type}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                      {row.engine || "DOC"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${severityTone(row.severity)}`}>
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.status}</td>
                  <td className="rounded-r-2xl px-4 py-3 text-slate-500">
                    <div className="flex flex-col">
                      <span>{row.timestamp}</span>
                      <span className="text-xs text-slate-400">{row.absoluteTimestamp || formatAuditTimestamp(row.timestamp, index)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </section>
  );
}

function MapVisualization({ details }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Global Risk Visualization</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Route and Region Intelligence</h2>
        </div>
        <Globe className="h-5 w-5 text-slate-400" />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <svg viewBox="0 0 760 320" className="h-auto w-full">
          <rect x="0" y="0" width="760" height="320" rx="24" fill="#f8fafc" />
          <path d="M78 118c38-36 84-49 122-40 28 7 54 5 83-6 35-14 73-10 102 9 35 23 58 18 83 2 34-22 75-25 126-8 40 13 64 12 97-6v102c-36 22-67 23-104 9-45-18-76-15-112 7-35 21-69 24-111 0-28-16-49-19-82-5-45 19-81 16-117-8-27-18-58-21-87-9V118Z" fill="#dbeafe" />
          <path d="M86 232c32-10 59-6 82 9 33 22 68 24 112 6 30-12 54-11 81 5 41 24 70 22 103 2 38-23 73-25 117-8 33 13 63 11 98-7" fill="none" stroke="#cbd5e1" strokeWidth="16" strokeLinecap="round" />
          <circle cx="520" cy="120" r="30" fill="#fee2e2" />
          <circle cx="612" cy="138" r="26" fill="#fed7aa" />
          <circle cx="662" cy="102" r="22" fill="#dcfce7" />
          <path d="M470 102C525 78 566 98 611 139C626 152 640 168 670 188" fill="none" stroke="#0f4c81" strokeWidth="4" strokeDasharray="8 7" />
          <circle cx="470" cy="102" r="9" fill="#0f4c81" />
          <circle cx="611" cy="139" r="10" fill="#f97316" />
          <circle cx="670" cy="188" r="9" fill="#0f4c81" />
          <g transform="translate(611 139)">
            <circle r="18" fill="#fff7ed" stroke="#fb923c" strokeWidth="3" />
            <text textAnchor="middle" y="5" fontSize="18" fontWeight="700" fill="#c2410c">!</text>
          </g>
          <text x="452" y="88" fill="#0f172a" fontSize="13" fontWeight="600">{details.origin}</text>
          <text x="646" y="212" fill="#0f172a" fontSize="13" fontWeight="600">{details.destination}</text>
          <text x="556" y="116" fill="#9a3412" fontSize="12" fontWeight="600">Transit node anomaly</text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">High-risk regions highlighted in red</div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Medium-risk transit nodes in orange</div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Low-risk clearance regions in green</div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Route overlay: {details.origin} ? Singapore ? {details.destination}. The marker indicates the point where the document set diverges from expected transit behavior.
      </p>
    </section>
  );
}

function IntelligencePanel({ analysis, intakeMode }) {
  const actionSteps =
    analysis.status === "HIGH"
      ? [
          "Review submitted invoice, bill of lading, and declaration values immediately.",
          "Place the shipment on hold pending compliance and cargo verification.",
          "Escalate the case to inspection control for physical examination.",
        ]
      : analysis.status === "MEDIUM"
        ? [
            "Review IGM, BOL, and invoice fields for cross-document mismatch.",
            "Verify company KYC and ownership details within 24 hours.",
            "Route the shipment to secondary inspection before release.",
          ]
        : [
            "Clear the shipment for standard processing.",
            "Retain the audit record for routine post-clearance review.",
            "Continue passive monitoring for related filings.",
          ];

  const narrativeBadges = [
    analysis.engineBreakdown.Document > 0.2 ? { label: "DOC", title: "Document inconsistency and value comparison" } : null,
    analysis.engineBreakdown.Physics > 0.2 ? { label: "PHYS", title: "Physical plausibility and cargo condition checks" } : null,
    analysis.engineBreakdown.Behavior > 0.2 ? { label: "BEHAV", title: "Behavioral timing and trust checks" } : null,
    analysis.engineBreakdown.Network > 0.2 ? { label: "NET", title: "Linked entity and network checks" } : null,
  ].filter(Boolean);

  const narrativeCards =
    intakeMode === "csv"
      ? [
          {
            title: "Manifest review",
            body: "Row-level comparison of declared values, quantities, origins, and entity identifiers across the uploaded manifest.",
          },
          {
            title: "Pattern checks",
            body: "GhostShip scans for unusual value gaps, timing anomalies, density outliers, and suspicious declaration patterns.",
          },
          {
            title: "Data completeness",
            body: "Missing shipment fields or incomplete manifest rows are treated as early warning signals before port arrival.",
          },
        ]
      : [
          {
            title: "Document review",
            body: "Cross-document comparison of value, quantity, origin, and container identifiers.",
          },
          {
            title: "Physical checks",
            body: "Cargo plausibility check based on temperature and density declarations.",
          },
          {
            title: "Completeness",
            body: "Missing core shipment fields raise risk even before the cargo reaches the port.",
          },
        ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI Intelligence Narrative</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Why the Shipment is Risky</h2>
        </div>
        <Radar className="h-5 w-5 text-slate-400" />
      </div>

      <p className="text-sm leading-7 text-slate-700">
        {intakeMode === "csv"
          ? analysis.shipmentDetails.shipmentId === "Pending"
            ? "GhostShip scans uploaded shipment manifests for row-level fraud patterns, declaration mismatches, and operational anomalies before cargo reaches the port."
            : analysis.explanation
          : analysis.explanation}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {narrativeBadges.map((badge) => (
          <span
            key={badge.label}
            title={badge.title}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700"
          >
            {badge.label}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {narrativeCards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.title}</p>
            <p className="mt-2 text-sm text-slate-700">{card.body}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommended Action</p>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{analysis.recommendedAction}</p>
            {actionSteps.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemStatus() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">System Status</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Platform Health</h2>
        </div>
        <ShieldCheck className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-3">
        {systemStatus.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">{item.label}</span>
            <strong className="text-sm font-semibold text-slate-900">{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
function QuickActions({ setActiveView, onExport }) {
  const actions = [
    { label: "Analyze New Shipment", icon: Upload, onClick: () => setActiveView("analysis") },
    { label: "View High Risk Cases", icon: AlertTriangle, onClick: () => setActiveView("monitoring") },
    { label: "Export Result", icon: Download, onClick: onExport },
    { label: "Trigger Inspection", icon: Clock3, onClick: () => setActiveView("audit") },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Actions</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Operational Controls</h2>
        </div>
        <Gauge className="h-5 w-5 text-slate-400" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:scale-[1.01] hover:bg-white"
          >
            <span className="text-sm font-medium text-slate-800">{action.label}</span>
            <action.icon className="h-4 w-4 text-slate-500" />
          </button>
        ))}
      </div>
    </section>
  );
}

function MonitoringTable({ results, riskFilter, setRiskFilter }) {
  const filters = [
    { key: "ALL", label: "All" },
    { key: "HIGH", label: "High Risk" },
    { key: "MEDIUM", label: "Medium" },
    { key: "LOW", label: "Low" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk Monitoring</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Flagged Shipment Register</h2>
        </div>
        <Boxes className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setRiskFilter(filter.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              riskFilter === filter.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="pb-2">Shipment</th>
              <th className="pb-2">Engine</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Risk Score</th>
              <th className="pb-2">Action</th>
              <th className="pb-2">Summary</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.shipment_id} className="rounded-2xl bg-slate-50">
                <td className="rounded-l-2xl px-4 py-3 font-medium text-slate-900">{result.shipment_id}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {result.engineBadges.map((badge) => (
                      <span
                        key={`${result.shipment_id}-${badge}`}
                        title={badge}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ${severityTone(result.classification)}`}>
                    {result.classification}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{result.risk_score}</td>
                <td className="px-4 py-3 text-slate-700">{result.action}</td>
                <td className="rounded-r-2xl px-4 py-3 text-slate-500">{result.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditQueue({ rows }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audit Queue</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Escalation Workflow</h2>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.shipmentId} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{row.shipmentId}</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{row.stage}</p>
            </div>
            <div className="grid gap-1 text-sm text-slate-600 md:justify-items-end">
              <span>{row.owner}</span>
              <strong className="text-slate-900">{row.eta}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DocumentInsights({ documents }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document Intelligence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Parsed Field Review</h2>
        </div>
        <FileText className="h-5 w-5 text-slate-400" />
      </div>

      <div className="grid gap-4 2xl:grid-cols-3">
        {documentFields.map((field) => {
          const document = documents[field.key] || defaultDocumentInsights[field.key];
          const fieldEntries = Object.entries(document.parsed_fields || {}).filter(
            ([key, value]) => key !== "document_type" && value !== null && value !== "",
          );

          return (
            <article key={field.key} className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{field.label}</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{document.file_name}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Extracted
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {fieldEntries.length ? (
                  fieldEntries.slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{key.replace(/_/g, " ")}</span>
                      <span className="text-right text-sm text-slate-800">{String(value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">No fields parsed yet.</div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Text excerpt</p>
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-700">{document.text_excerpt}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FutureModules() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Future Modules</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Platform Expansion Track</h2>
        </div>
        <Container className="h-5 w-5 text-slate-400" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Global Intelligence</p>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Coming Soon</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Route risk overlay</li>
            <li>Country risk scoring</li>
            <li>Congestion level tracking</li>
          </ul>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Network Graph</p>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Coming Soon</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Linked entities</li>
            <li>Shared-director relationships</li>
            <li>Watchlist cluster overlays</li>
          </ul>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Historical Behavior</p>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Coming Soon</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Past shipments</p>
              <p className="mt-2 text-sm text-slate-700">36 filings in trailing quarter</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Risk trend</p>
              <p className="mt-2 text-sm text-slate-700">Document deviations rising on this trade lane</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Inspection outcomes</p>
              <p className="mt-2 text-sm text-slate-700">Historical inspection archive pending live sync</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [activeView, setActiveView] = useState("operations");
  const [intakeMode, setIntakeMode] = useState("documents");
  const [documents, setDocuments] = useState({
    invoice: null,
    packing_list: null,
    bill_of_lading: null,
  });
  const [csvFile, setCsvFile] = useState(null);
  const [csvSettings, setCsvSettings] = useState(defaultCsvSettings);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [dashboardStats, setDashboardStats] = useState(baseDashboardStats);
  const [results, setResults] = useState(defaultResults);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [anomalyRows, setAnomalyRows] = useState([
    { type: "Waiting for uploaded shipment documents", severity: "LOW", status: "Idle", timestamp: "Now" },
  ]);
  const [documentInsights, setDocumentInsights] = useState(defaultDocumentInsights);
  const [error, setError] = useState("");

  const alerts = useMemo(
    () =>
      anomalyRows.slice(0, 5).map((row, index) => ({
        shipmentId: analysis.shipmentDetails.containerId,
        message: row.type,
        origin: analysis.shipmentDetails.origin,
        destination: analysis.shipmentDetails.destination,
        timestamp: row.timestamp || `${index + 1} min ago`,
        severity: row.severity,
      })),
    [analysis.shipmentDetails.containerId, analysis.shipmentDetails.destination, analysis.shipmentDetails.origin, anomalyRows],
  );

  const monitoredResults = useMemo(() => {
    const normalized = (results || []).map(normalizeResult).sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0));
    if (riskFilter === "ALL") return normalized;
    return normalized.filter((result) => result.classification === riskFilter);
  }, [results, riskFilter]);

  function handleExport() {
    downloadAnalysisReport({ analysis, results, anomalyRows, intakeMode });
  }

  function updateDocument(docType, file) {
    setDocuments((current) => ({ ...current, [docType]: file || null }));
    setError("");
  }

  function updateCsv(file) {
    setCsvFile(file || null);
    setError("");
  }

  function updateCsvSetting(key, value) {
    setCsvSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setError("");
  }

  async function handleAnalyze() {
    if (intakeMode === "documents") {
      const ready = documentFields.every((field) => documents[field.key]);
      if (!ready) {
        setError("Please upload invoice, packing list, and bill of lading before analyzing.");
        return;
      }
    } else if (!csvFile) {
      setError("Please upload a CSV file before analyzing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      let response;

      if (intakeMode === "documents") {
        documentFields.forEach((field) => formData.append(field.key, documents[field.key]));
        response = await fetch("/api/analyze-documents", { method: "POST", body: formData });
      } else {
        formData.append("file", csvFile);
        formData.append("settings", JSON.stringify(csvSettings));
        response = await fetch("/api/analyze", { method: "POST", body: formData });
      }

      const rawBody = await response.text();
      const payload = rawBody ? JSON.parse(rawBody) : null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.message ||
            (rawBody
              ? `Analysis request failed (${response.status}).`
              : "Backend returned an empty response. Make sure python api.py is running."),
        );
      }

      const top = payload.top_result;
      const details = top.shipment_details;
      const engineBreakdown = mapBreakdown(top.engine_breakdown);
      const declaredValue = formatCurrency(details.value);
      const comparisonInsight = deriveExpectedRange(declaredValue);
        const anomalies =
          payload.anomalies ||
          Object.entries(payload.results?.[0]?.details || {}).flatMap(([category, group], index) =>
            Object.values(group).map((message, valueIndex) => ({
              type: message,
              severity: classifyRiskScore(payload.results?.[0]?.risk_score ?? top.risk_score ?? 0),
              status: valueIndex === 0 ? "Open" : "Review",
              timestamp: `${index + valueIndex + 1} min ago`,
              category,
            })),
          );

      setAnalysis({
        riskScore: top.risk_score,
        confidenceScore: deriveConfidence(engineBreakdown, top.confidence),
        status: top.status || classifyRiskScore(top.risk_score),
        recommendedAction: top.recommended_action || actionForStatus(top.status || classifyRiskScore(top.risk_score)),
        explanation: top.explanation,
        shipmentDetails: {
          shipmentId: details.shipment_id || "Unknown",
          containerId: details.container_id || details.shipment_id || "Unknown",
          company: details.company || details.company_name || "Unknown",
          commodity: details.commodity || "Unknown",
          origin: details.origin || "Unknown",
          destination: details.destination || "Unknown",
          quantity: formatLooseValue(details.quantity),
          declaredValue,
          weight: formatMetric(details.weight_kg, "KG"),
          volume: formatMetric(details.volume_cbm, "CBM"),
          temperature:
            details.temperature_celsius === null || details.temperature_celsius === undefined
              ? "Unknown"
              : `${details.temperature_celsius} C`,
        },
        engineBreakdown,
        riskFactors: (anomalies.length ? anomalies : [{ type: "No material anomalies detected" }]).map((row) => row.type).slice(0, 5),
        riskTags: top.risk_tags || deriveRiskTags(engineBreakdown, anomalies),
        operationalImpact: {
          riskValue: `${declaredValue} under customs review`,
          inspectionRequirement: actionForStatus(classifyRiskScore(top.risk_score)),
        },
        comparisonInsight,
      });

      setDocumentInsights(intakeMode === "documents" ? payload.documents || defaultDocumentInsights : defaultDocumentInsights);
      if (intakeMode === "csv" && payload.settings) {
        setCsvSettings(payload.settings);
      }
      setResults((payload.results || defaultResults).map(normalizeResult));
      setRiskFilter("ALL");
      setAnomalyRows(
        anomalies.length
          ? anomalies.map((row, index) => ({
              ...row,
              engine: row.engine || engineLabelFromCategory(row.category),
              absoluteTimestamp: row.absoluteTimestamp || formatAuditTimestamp(row.timestamp, index),
            }))
          : [
              {
                type: "No material anomalies detected",
                severity: "LOW",
                status: "Closed",
                timestamp: "Just now",
                absoluteTimestamp: formatAuditTimestamp("Just now"),
                engine: "DOC",
              },
            ],
      );
      setDashboardStats([
        {
          ...baseDashboardStats[0],
          value: payload.summary.total_shipments.toLocaleString(),
          description: "Active document set under intelligence review",
          updated: "Just now",
        },
        {
          ...baseDashboardStats[1],
          value: payload.summary.high_risk_alerts.toLocaleString(),
          description: "High-risk document sets requiring inspection",
          updated: "Just now",
        },
        {
          ...baseDashboardStats[2],
          value: payload.summary.medium_risk.toLocaleString(),
          description: "Secondary review candidates in current queue",
          updated: "Just now",
        },
        {
          ...baseDashboardStats[3],
          value: payload.summary.cleared_shipments.toLocaleString(),
          description: "Document sets ready for direct processing",
          updated: "Just now",
        },
      ]);
      setActiveView("analysis");
    } catch (requestError) {
      setError(requestError.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[1.65fr_minmax(320px,0.95fr)]">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {dashboardStats.map((card) => (
                <StatCard key={card.title} card={card} />
              ))}
            </div>

            {(activeView === "operations" || activeView === "monitoring") && <AlertFeed alerts={alerts} />}

            {(activeView === "operations" || activeView === "analysis") && (
              <div className="grid gap-5 xl:grid-cols-[1.1fr_minmax(320px,0.9fr)]">
                <UploadBox
                  intakeMode={intakeMode}
                  setIntakeMode={setIntakeMode}
                  documents={documents}
                  csvFile={csvFile}
                  csvSettings={csvSettings}
                  onCsvSettingChange={updateCsvSetting}
                  loading={loading}
                  error={error}
                  onFileChange={updateDocument}
                  onCsvChange={updateCsv}
                  handleAnalyze={handleAnalyze}
                />
                <ShipmentDetails details={analysis.shipmentDetails} intakeMode={intakeMode} />
              </div>
            )}
          </div>

          <div className="grid gap-5">
            {(activeView === "operations" || activeView === "analysis") && <RiskGauge analysis={analysis} />}
            <SystemStatus />
            <QuickActions setActiveView={setActiveView} onExport={handleExport} />
          </div>
        </section>

        {(activeView === "operations" || activeView === "analysis") && (
          <section className="grid gap-5 2xl:grid-cols-[1.2fr_0.95fr]">
            <AnomalyTable rows={anomalyRows} analysis={analysis} />
            <IntelligencePanel analysis={analysis} intakeMode={intakeMode} />
          </section>
        )}

        {(activeView === "operations" || activeView === "analysis") && <DocumentInsights documents={documentInsights} />}

        {(activeView === "operations" || activeView === "monitoring") && (
          <section className="grid gap-5 2xl:grid-cols-[1.05fr_1.2fr]">
            <MonitoringTable results={monitoredResults} riskFilter={riskFilter} setRiskFilter={setRiskFilter} />
            <MapVisualization details={analysis.shipmentDetails} />
          </section>
        )}

        {(activeView === "operations" || activeView === "audit") && (
          <section className="grid gap-5 xl:grid-cols-[1.05fr_1.3fr]">
            <AuditQueue rows={auditQueueRows} />
            <FutureModules />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
