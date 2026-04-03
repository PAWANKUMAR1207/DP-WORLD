import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Boxes,
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

const defaultOfficerProfile = {
  full_name: "Officer A. Rahman",
  role_title: "Customs Risk Officer",
  badge_id: "ID CR-4172",
  email: "arahman@ghostship.local",
  terminal: "Terminal 4",
  shift_name: "Morning Shift",
  photo_url: null,
};

const defaultCsvSettings = {
  low_risk_max: 30,
  medium_risk_max: 70,
  quantity_mismatch_threshold: 0.05,
  value_mismatch_threshold: 0.05,
  density_threshold: 2000,
  banana_temperature_floor: 10,
};

const defaultHeroMetric = {
  eyebrow: "Monthly Operations Review",
  title: "2,847 shipments analyzed this month",
  description: "Detection coverage across manifest variance, declaration review, cargo integrity, and entity relationship checks.",
  trend: "+12.4%",
  direction: "up",
  updated: "Updated 4 min ago",
  sparkline: [28, 31, 34, 33, 37, 41, 45, 48, 52],
};

const defaultAnalysis = {
  riskScore: 0,
  confidenceScore: null,
  status: "LOW",
  recommendedAction: "Upload a document set to begin analysis",
  explanation:
    "Upload invoice, packing list, and bill of lading files or a shipment manifest to start the review.",
  shipmentDetails: {
    shipmentId: "Pending",
    containerId: "Pending",
    company: "Unknown",
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
    "Upload invoice, packing list, and bill of lading to begin review.",
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

const demoAnalysis = {
  riskScore: 67,
  confidenceScore: 92,
  status: "MEDIUM",
  recommendedAction: "Secondary inspection",
  explanation:
    "The current review identifies quantity variance, declared value drift, and linked-entity history that together justify a secondary inspection decision.",
  shipmentDetails: {
    shipmentId: "SHP-2024-0892",
    containerId: "MSCU-458221-7",
    company: "BlueWave Logistics LLC",
    commodity: "Consumer electronics",
    origin: "Shanghai",
    destination: "Singapore",
    quantity: "8,944 units",
    declaredValue: "USD 2,134,082.19",
    weight: "18,420 KG",
    volume: "31.8 CBM",
    temperature: "Controlled ambient",
  },
  engineBreakdown: {
    Physics: 0.27,
    Document: 0.43,
    Behavior: 0.18,
    Network: 0.12,
  },
  riskFactors: [
    "Quantity variance: 9.1% below expected",
    "Value discrepancy: USD 456K under declared range",
    "Entity linked to 2 prior anomalies",
  ],
  riskTags: ["DECLARATION DISCREPANCY", "CARGO ANOMALY DETECTED", "ENTITY PROFILE ALERT"],
  operationalImpact: {
    riskValue: "USD 2,134,082.19 under customs review",
    inspectionRequirement: "Secondary inspection",
  },
  comparisonInsight: {
    declared: "USD 2,134,082.19",
    expected: "USD 2,603,580 - USD 3,371,850",
  },
  mismatchMatrix: [
    { label: "IGM vs BOL", left: "9,840 units", right: "8,944 units", state: "review" },
    { label: "BOL vs Invoice", left: "8,944 units", right: "8,944 units", state: "aligned" },
    { label: "IGM vs Invoice", left: "USD 2.59M", right: "USD 2.13M", state: "variance" },
  ],
};

const demoResults = [
  {
    shipment_id: "SHP-2024-0892",
    classification: "MEDIUM",
    risk_score: 67,
    action: "Secondary inspection",
    explanation: demoAnalysis.explanation,
    details: {
      document: {
        quantity_variance: "9.1% below expected quantity across IGM and BOL",
        value_discrepancy: "Declared value remains USD 456K below expected range",
      },
      network: {
        entity_alert: "Linked entity appears in two prior anomaly reviews",
      },
    },
  },
];

const demoDocumentInsights = {
  invoice: {
    file_name: "invoice_shp_2024_0892.pdf",
    parsed_fields: {
      container_id: "MSCU-458221-7",
      shipment_id: "SHP-2024-0892",
      commodity: "Consumer electronics",
      declared_value: "USD 2,134,082.19",
      quantity: "8,944 units",
      origin_country: "China",
    },
    text_excerpt: "Commercial invoice extracted successfully. Declared value USD 2,134,082.19 for 8,944 consumer electronics units routed Shanghai to Singapore.",
  },
  packing_list: {
    file_name: "packing_list_shp_2024_0892.pdf",
    parsed_fields: {
      carton_count: "224 cartons",
      net_weight: "17,860 KG",
      gross_weight: "18,420 KG",
      volume_cbm: "31.8 CBM",
      quantity: "8,944 units",
      destination_port: "Singapore",
    },
    text_excerpt: "Packing list extracted successfully. Quantity aligns with invoice, while weight and carton structure support cargo verification checks.",
  },
  bill_of_lading: {
    file_name: "bol_shp_2024_0892.pdf",
    parsed_fields: {
      bol_number: "BOL-884291-SG",
      container_id: "MSCU-458221-7",
      shipper: "BlueWave Logistics LLC",
      consignee: "Harbor Retail Pte Ltd",
      quantity: "8,944 units",
      route: "Shanghai to Singapore",
    },
    text_excerpt: "Bill of lading extracted successfully. Route and consignee data align, but the IGM comparison still indicates quantity variance requiring review.",
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

function parseCurrencyNumber(valueText) {
  const numeric = Number(String(valueText ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildContributionSegments(engineBreakdown) {
  const entries = [
    { key: "Document", label: "Declaration Verification", color: "#2563eb", value: engineBreakdown.Document ?? 0 },
    { key: "Physics", label: "Cargo Integrity", color: "#f97316", value: engineBreakdown.Physics ?? 0 },
    { key: "Behavior", label: "Entity Profile", color: "#14b8a6", value: engineBreakdown.Behavior ?? 0 },
    { key: "Network", label: "Relationship Analysis", color: "#8b5cf6", value: engineBreakdown.Network ?? 0 },
  ];

  const total = entries.reduce((sum, entry) => sum + entry.value, 0) || 1;
  let cursor = 0;
  const segments = entries.map((entry) => {
    const percentage = Math.round((entry.value / total) * 100);
    const start = cursor;
    cursor += (entry.value / total) * 100;
    return {
      ...entry,
      percentage,
      start,
      end: cursor,
    };
  });

  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return { segments, gradient };
}

function buildMismatchMatrix(analysis) {
  if (Array.isArray(analysis.mismatchMatrix) && analysis.mismatchMatrix.length) {
    return analysis.mismatchMatrix;
  }
  const mismatch = analysis.riskFactors.some((factor) => /deviation|mismatch|variance|inconsistency/i.test(factor));
  const cargo = analysis.riskTags.some((tag) => tag.includes("CARGO"));
  const states = {
    igm_bol: mismatch ? "variance" : "aligned",
    bol_invoice: mismatch ? "variance" : "aligned",
    igm_invoice: cargo ? "review" : mismatch ? "variance" : "aligned",
  };

  return [
    { label: "IGM vs BOL", left: "Review required", right: "Field variance", state: states.igm_bol },
    { label: "BOL vs Invoice", left: "Review required", right: "Field variance", state: states.bol_invoice },
    { label: "IGM vs Invoice", left: "Review required", right: "Field variance", state: states.igm_invoice },
  ];
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
  if (engineBreakdown.Document >= 0.35) tags.push("DOCUMENT DISCREPANCY");
  if (engineBreakdown.Physics >= 0.35) tags.push("CARGO ANOMALY DETECTED");
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
    { key: "physics", label: "VERIFY" },
    { key: "document", label: "DOC" },
    { key: "behavior", label: "ENTITY" },
    { key: "network", label: "REL" },
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
  if (category === "physics") return "VERIFY";
  if (category === "document") return "DOC";
  if (category === "behavior") return "ENTITY";
  if (category === "network") return "REL";
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

function Navbar({ activeView, setActiveView, officerProfile }) {
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
          <button
            type="button"
            onClick={() => setActiveView("profile")}
            className={`hidden items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm transition hover:scale-[1.01] lg:flex ${
              activeView === "profile" ? "border-slate-300 ring-2 ring-slate-200" : "border-slate-200"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-600">
              {officerProfile.photo_url ? (
                <img src={officerProfile.photo_url} alt={officerProfile.full_name} className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{officerProfile.full_name}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {officerProfile.role_title} | {officerProfile.badge_id}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveView("profile")}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:scale-[1.01] hover:text-slate-900 lg:hidden"
            title={`${officerProfile.full_name} | ${officerProfile.role_title}`}
          >
            {officerProfile.photo_url ? (
              <img src={officerProfile.photo_url} alt={officerProfile.full_name} className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function OfficerProfilePanel({ profile, form, onChange, onPhotoChange, onSave, saving, saveMessage }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Account</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Customs Officer Profile</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Maintain the operator identity shown in the GhostShip navbar and keep the duty assignment current for audit visibility.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-slate-200 text-slate-500">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              <UserCircle2 className="h-10 w-10" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950">{profile.full_name}</p>
            <p className="truncate text-sm text-slate-600">{profile.role_title}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{profile.badge_id}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Full Name</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.full_name} onChange={(event) => onChange("full_name", event.target.value)} />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Role Title</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.role_title} onChange={(event) => onChange("role_title", event.target.value)} />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Badge ID</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.badge_id} onChange={(event) => onChange("badge_id", event.target.value)} />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Email</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.email} onChange={(event) => onChange("email", event.target.value)} />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Terminal</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.terminal} onChange={(event) => onChange("terminal", event.target.value)} />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Shift</span>
          <input className="mt-2 w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none" value={form.shift_name} onChange={(event) => onChange("shift_name", event.target.value)} />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white xl:w-auto">
          <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(event) => onPhotoChange(event.target.files?.[0] || null)} />
          Upload Officer Photo
        </label>
        <div className="flex flex-col gap-3 xl:items-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Saving Profile..." : "Save Officer Profile"}
          </button>
          {saveMessage ? <p className="text-sm text-slate-600">{saveMessage}</p> : null}
        </div>
      </div>
    </section>
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

function HeroMetric({ card }) {
  const TrendIcon = card.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const trendTone =
    card.direction === "up"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : "text-amber-700 bg-amber-50 ring-amber-200";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{card.description}</p>
        </div>
        <div className="flex flex-col items-start gap-3 xl:items-end">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${trendTone}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {card.trend}
          </span>
          <Sparkline points={card.sparkline} />
          <p className="text-xs text-slate-400">{card.updated}</p>
        </div>
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
                    {alert.origin} to {alert.destination}
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
  const uploadedCount = intakeMode === "documents" ? Object.values(documents).filter(Boolean).length : csvFile ? 1 : 0;
  const totalRequired = intakeMode === "documents" ? 3 : 1;
  const workflowText =
    intakeMode === "documents"
      ? "Upload all 3 documents. We compare, score, and flag the highest-risk issues."
      : "Upload your CSV. We scan every row and surface the riskiest shipments first.";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document Intake</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
            {intakeMode === "documents" ? "Upload Shipment Document Set" : "Upload Shipment Manifest"}
          </h2>
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px] xl:items-end">
          <div className="grid w-full grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 xl:max-w-[440px]">
            {intakeModes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setIntakeMode(mode.key)}
                className={`rounded-xl px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                  intakeMode === mode.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
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

      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">
            {uploadedCount} of {totalRequired} {intakeMode === "documents" ? "documents" : "files"} uploaded
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {ready ? "Ready for review" : "Awaiting upload"}
          </p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all duration-700"
            style={{ width: `${(uploadedCount / totalRequired) * 100}%` }}
          />
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
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
                  <Upload className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-slate-900">{field.label}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">Upload the supporting document for this shipment.</p>
                  <p
                    className={`mt-4 text-sm font-medium ${
                      documents[field.key]?.name ? "break-all text-slate-900" : "text-slate-500"
                    }`}
                  >
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
                Upload your shipment manifest. We'll scan every row for discrepancies and shipment anomalies.
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

      <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 xl:max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{workflowText}</p>
        </div>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={handleAnalyze}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none xl:w-auto"
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
  const scoreTone =
    analysis.riskScore > 70 ? "#be123c" : analysis.riskScore > 30 ? "#f59e0b" : "#15803d";
  const statusHeadline = hasActiveAnalysis
    ? `${analysis.status} RISK — ${analysis.recommendedAction.toUpperCase()}`
    : "AWAITING REVIEW — UPLOAD REQUIRED";
  const declaredNumber = parseCurrencyNumber(analysis.comparisonInsight.declared);
  const expectedNumbers = String(analysis.comparisonInsight.expected)
    .split("-")
    .map((value) => parseCurrencyNumber(value));
  const expectedHigh = Math.max(...expectedNumbers, 0);
  const valueScale = Math.max(declaredNumber, expectedHigh, 1);
  const declaredWidth = `${Math.max((declaredNumber / valueScale) * 100, declaredNumber ? 8 : 0)}%`;
  const expectedWidth = `${Math.max((expectedHigh / valueScale) * 100, expectedHigh ? 8 : 0)}%`;
  const { segments, gradient } = buildContributionSegments(analysis.engineBreakdown);
  const mismatchMatrix = buildMismatchMatrix(analysis);
  const auditStamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-5 grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50/80 px-4 py-4 md:grid-cols-2 2xl:grid-cols-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Shipment ID</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{analysis.shipmentDetails.shipmentId}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Company</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{analysis.shipmentDetails.company || "Unknown"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Route</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{analysis.shipmentDetails.origin} {"->"} {analysis.shipmentDetails.destination}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Audit Timestamp</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{auditStamp}</p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk Analysis</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em]" style={{ color: scoreTone }}>
            {statusHeadline}
          </p>
          <div className="mt-5 flex flex-col items-center justify-center">
            <div className="relative">
              <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
                <circle cx="80" cy="80" r="58" stroke="#dbe4ef" strokeWidth="14" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="58"
                  stroke={scoreTone}
                  strokeWidth="14"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 1s ease, stroke 0.4s ease" }}
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
              System Certainty:{" "}
              <span className="font-semibold text-slate-900">
                {analysis.confidenceScore == null ? "--" : `${analysis.confidenceScore}%`}
              </span>
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Engine Contribution</p>
                <p className="mt-1 text-sm text-slate-600">Current review weighting by detection stream.</p>
              </div>
              <div
                className="h-20 w-20 rounded-full"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div className="m-[10px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700">
                  4 streams
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {segments.map((segment, index) => (
                <div
                  key={segment.key}
                  className="opacity-0"
                  style={{ animation: `fadeIn 0.45s ease forwards`, animationDelay: `${index * 120}ms` }}
                >
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <span>{segment.label}</span>
                    <span>{segment.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Detected Anomalies</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {analysis.riskFactors.map((factor, index) => (
                <li
                  key={factor}
                  className="flex gap-3 opacity-0"
                  style={{ animation: "fadeIn 0.45s ease forwards", animationDelay: `${index * 120}ms` }}
                >
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 3xl:grid-cols-[1.05fr_1.15fr]">
            <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mismatch Matrix</p>
              <div className="mt-4 grid gap-3">
                {mismatchMatrix.map((cell) => {
                  const tone =
                    cell.state === "variance"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : cell.state === "review"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700";
                  const label = cell.state === "variance" ? "X" : cell.state === "review" ? "!" : "Check";
                  return (
                    <div key={cell.label} className={`rounded-2xl border px-4 py-4 ${tone}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{cell.label}</p>
                          <p className="mt-2 text-sm font-medium">{cell.left}</p>
                          <p className="mt-1 text-sm font-medium">{cell.right}</p>
                        </div>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Comparison Insight</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <p className="text-sm text-slate-500">Declared</p>
                  <p className="break-words text-base font-semibold text-slate-950">{analysis.comparisonInsight.declared}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expected range</p>
                  <p className="max-w-[260px] text-base font-semibold leading-8 text-slate-950">{analysis.comparisonInsight.expected}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Declared value</p>
                    <div className="mt-2 h-3 rounded-full bg-slate-200">
                      <div className="h-3 rounded-full bg-slate-900 transition-all duration-700" style={{ width: declaredWidth }} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Expected range ceiling</p>
                    <div className="mt-2 h-3 rounded-full bg-slate-200">
                      <div className="h-3 rounded-full bg-amber-500 transition-all duration-700" style={{ width: expectedWidth }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clearance Status</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
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
            {analysis.shipmentDetails.origin} {"->"} {analysis.shipmentDetails.destination}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Commodity / Value</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {analysis.shipmentDetails.commodity} - {analysis.shipmentDetails.declaredValue}
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
        Route overlay: {details.origin} to {details.destination}. The marker indicates the point where the document set diverges from expected transit behavior.
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
    analysis.engineBreakdown.Document > 0.2 ? { label: "DOC", title: "Declaration verification and value comparison" } : null,
    analysis.engineBreakdown.Physics > 0.2 ? { label: "VERIFY", title: "Cargo integrity and commodity profile checks" } : null,
    analysis.engineBreakdown.Behavior > 0.2 ? { label: "ENTITY", title: "Submission patterns and entity history checks" } : null,
    analysis.engineBreakdown.Network > 0.2 ? { label: "REL", title: "Relationship analysis and network mapping checks" } : null,
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
            body: "The current manifest shows a measurable quantity gap, a declared-value shortfall, and linked-entity history that warrant inspection.",
          },
          {
            title: "Data completeness",
            body: "Document completeness remains acceptable, allowing the review to focus on declaration variance instead of missing-data exceptions.",
          },
        ]
      : [
          {
            title: "Document review",
            body: "Invoice, IGM, and bill of lading records show a measurable quantity variance and a declaration-value gap.",
          },
          {
            title: "Cargo integrity",
            body: "Cargo integrity checks remain within tolerance, but the file set still presents a declaration inconsistency requiring review.",
          },
          {
            title: "Entity history",
            body: "The submitting entity is linked to two prior anomaly reviews on comparable electronics filings.",
          },
        ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">System Narrative</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Why the Shipment is Risky</h2>
        </div>
        <Radar className="h-5 w-5 text-slate-400" />
      </div>

      <ul className="space-y-3 text-sm leading-7 text-slate-700">
        {analysis.riskFactors.slice(0, 3).map((factor) => (
          <li key={factor} className="flex items-start gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>{factor}</span>
          </li>
        ))}
      </ul>

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
function QuickActions({ setActiveView, onExport, onLaunchDemo }) {
  const actions = [
    { label: "Launch Demo Review", icon: Upload, onClick: onLaunchDemo, priority: "primary" },
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
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:scale-[1.01] ${
              action.priority === "primary"
                ? "animate-pulse border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100"
                : "border-slate-200 bg-slate-50 hover:bg-white"
            }`}
          >
            <span className={`text-sm font-medium ${action.priority === "primary" ? "text-sky-950" : "text-slate-800"}`}>{action.label}</span>
            <action.icon className={`h-4 w-4 ${action.priority === "primary" ? "text-sky-700" : "text-slate-500"}`} />
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
            <p className="text-sm font-semibold text-slate-900">Relationship Mapping</p>
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
            <p className="text-sm font-semibold text-slate-900">Entity History</p>
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [heroMetric, setHeroMetric] = useState(defaultHeroMetric);
  const [results, setResults] = useState(defaultResults);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [anomalyRows, setAnomalyRows] = useState([
    { type: "Quantity variance: 9.1% below expected", severity: "MEDIUM", status: "Open", timestamp: "2 min ago", engine: "DOC" },
    { type: "Value discrepancy: USD 456K under declared range", severity: "MEDIUM", status: "Review", timestamp: "3 min ago", engine: "DOC" },
    { type: "Entity linked to 2 prior anomalies", severity: "MEDIUM", status: "Open", timestamp: "4 min ago", engine: "REL" },
  ]);
  const [documentInsights, setDocumentInsights] = useState(defaultDocumentInsights);
  const [officerProfile, setOfficerProfile] = useState(defaultOfficerProfile);
  const [profileForm, setProfileForm] = useState(defaultOfficerProfile);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOfficerProfile() {
      try {
        const response = await fetch("/api/officer-profile");
        const payload = await response.json();
        if (payload?.ok && payload.profile) {
          setOfficerProfile(payload.profile);
          setProfileForm(payload.profile);
        }
      } catch {
        // Keep local defaults if profile service is unavailable.
      }
    }

    loadOfficerProfile();
  }, []);

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

  function loadDemoReview() {
    setIntakeMode("documents");
    setDocuments({
      invoice: null,
      packing_list: null,
      bill_of_lading: null,
    });
    setCsvFile(null);
    setError("");
    setAnalysis(demoAnalysis);
    setResults(demoResults.map(normalizeResult));
    setAnomalyRows([
      { type: "Quantity variance: 9.1% below expected", severity: "MEDIUM", status: "Open", timestamp: "2 min ago", engine: "DOC" },
      { type: "Value discrepancy: USD 456K under declared range", severity: "MEDIUM", status: "Review", timestamp: "3 min ago", engine: "DOC" },
      { type: "Entity linked to 2 prior anomalies", severity: "MEDIUM", status: "Open", timestamp: "4 min ago", engine: "REL" },
    ]);
    setDocumentInsights(demoDocumentInsights);
    setActiveView("analysis");
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

  function updateProfileField(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
  }

  async function saveOfficerProfile() {
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const formData = new FormData();
      Object.entries(profileForm).forEach(([key, value]) => {
        if (key !== "photo_url") {
          formData.append(key, value ?? "");
        }
      });
      if (profilePhoto) {
        formData.append("photo", profilePhoto);
      }

      const response = await fetch("/api/officer-profile", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Could not save officer profile");
      }

      setOfficerProfile(payload.profile);
      setProfileForm(payload.profile);
      setProfilePhoto(null);
      setProfileMessage("Officer profile updated successfully.");
    } catch (saveError) {
      setProfileMessage(saveError.message || "Could not save officer profile");
    } finally {
      setProfileSaving(false);
    }
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
      setHeroMetric({
        eyebrow: "Current upload review",
        title: `${payload.summary.total_shipments.toLocaleString()} shipments analyzed in this intake`,
        description: `${payload.summary.high_risk_alerts.toLocaleString()} priority reviews, ${payload.summary.medium_risk.toLocaleString()} secondary checks, ${payload.summary.cleared_shipments.toLocaleString()} direct clearances.`,
        trend: `${top.risk_score}/100 top risk`,
        direction: top.risk_score > 70 ? "up" : "down",
        updated: "Updated just now",
        sparkline: [22, 26, 29, 31, 35, 38, 42, 45, 49],
      });
      setActiveView("analysis");
    } catch (requestError) {
      setError(requestError.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} officerProfile={officerProfile} />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-6 sm:px-6 lg:px-8">
        {activeView === "profile" && (
          <OfficerProfilePanel
            profile={officerProfile}
            form={profileForm}
            onChange={updateProfileField}
            onPhotoChange={setProfilePhoto}
            onSave={saveOfficerProfile}
            saving={profileSaving}
            saveMessage={profileMessage}
          />
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "analysis") && (
          <section>
            <HeroMetric card={heroMetric} />
          </section>
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "analysis") && (
          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(460px,0.88fr)]">
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
            <RiskGauge analysis={analysis} />
          </section>
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "analysis") && (
          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]">
            <ShipmentDetails details={analysis.shipmentDetails} intakeMode={intakeMode} />
            <div className="grid gap-5">
              <SystemStatus />
              <QuickActions setActiveView={setActiveView} onExport={handleExport} onLaunchDemo={loadDemoReview} />
            </div>
          </section>
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "monitoring") && <AlertFeed alerts={alerts} />}

        {activeView !== "profile" && (activeView === "operations" || activeView === "analysis") && (
          <section className="grid gap-5 2xl:grid-cols-[1.2fr_0.95fr]">
            <AnomalyTable rows={anomalyRows} analysis={analysis} />
            <IntelligencePanel analysis={analysis} intakeMode={intakeMode} />
          </section>
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "analysis") && <DocumentInsights documents={documentInsights} />}

        {activeView !== "profile" && (activeView === "operations" || activeView === "monitoring") && (
          <section className="grid gap-5 2xl:grid-cols-[1.05fr_1.2fr]">
            <MonitoringTable results={monitoredResults} riskFilter={riskFilter} setRiskFilter={setRiskFilter} />
            <MapVisualization details={analysis.shipmentDetails} />
          </section>
        )}

        {activeView !== "profile" && (activeView === "operations" || activeView === "audit") && (
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



