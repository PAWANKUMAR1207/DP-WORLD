import { useEffect, useMemo, useState } from "react";
import {
  Navbar,
  UploadBox,
  RiskGauge,
  HeroMetric,
  AlertFeed,
  ShipmentDetails,
  SystemStatus,
  QuickActions,
  AnomalyTable,
  IntelligencePanel,
  DocumentInsights,
  MonitoringTable,
  AuditQueue,
  SanctionsWatchlist,
  OfficerProfilePanel,
  DocumentVision,
  PDFReportGenerator,
  RouteIntelligence,
  AnomalyFeedbackPanel,
} from "./components";
import { useAnalysis } from "./hooks/useAnalysis";
import { useOfficer } from "./hooks/useOfficer";
import {
  mapBreakdown,
  deriveConfidence,
  deriveExpectedRange,
  deriveRiskTags,
  engineLabelFromCategory,
  formatAuditTimestamp,
  formatCurrency,
  formatLooseValue,
  formatMetric,
  classifyRiskScore,
  actionForStatus,
} from "./utils/formatters";

const documentFields = [
  { key: "invoice", label: "Commercial Invoice" },
  { key: "packing_list", label: "Packing List" },
  { key: "bill_of_lading", label: "Bill of Lading" },
];

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

const systemStatusItems = [
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

const defaultAnomalyRows = [
  { type: "Quantity variance: 9.1% below expected", severity: "MEDIUM", status: "Open", timestamp: "2 min ago", engine: "DOC" },
  { type: "Value discrepancy: USD 456K under declared range", severity: "MEDIUM", status: "Review", timestamp: "3 min ago", engine: "DOC" },
  { type: "Entity linked to 2 prior anomalies", severity: "MEDIUM", status: "Open", timestamp: "4 min ago", engine: "REL" },
];

function titleCaseEngine(engine) {
  return engine.charAt(0).toUpperCase() + engine.slice(1).toLowerCase();
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
  const detailMessages = Object.entries(result.details || {}).flatMap(([category, group]) =>
    Object.values(group || {}).map((message) => ({ category, message })),
  );

  let summary;
  if (!detailMessages.length) {
    summary = status === "LOW"
      ? "No significant anomalies detected. Shipment appears normal."
      : `Risk Score: ${score}/100. Review required based on model and rule-based scoring signals.`;
  } else {
    const uniqueMessages = [...new Set(detailMessages.map((item) => item.message))];
    summary = `Risk Score: ${score}/100. Key concerns: ${uniqueMessages.slice(0, 3).join("; ")}`;
  }

  return {
    ...result,
    classification: status,
    action: result.action || actionForStatus(status),
    summary,
    engineBadges: deriveEngineBadges(result),
  };
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

export default function App() {
  const [activeView, setActiveView] = useState("operations");
  const [intakeMode, setIntakeMode] = useState("documents");
  const [documents, setDocuments] = useState({ invoice: null, packing_list: null, bill_of_lading: null });
  const [csvFile, setCsvFile] = useState(null);
  const [csvSettings, setCsvSettings] = useState(defaultCsvSettings);
  const [documentInsights, setDocumentInsights] = useState(defaultDocumentInsights);
  const [anomalyRows, setAnomalyRows] = useState(defaultAnomalyRows);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [heroMetric, setHeroMetric] = useState(defaultHeroMetric);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [anomalyFeedback, setAnomalyFeedback] = useState({});

  const { profile, form, saving, message, updateField, saveProfile } = useOfficer();
  const { analysis, setAnalysis, results, setResults, loading, error, setError, resetAnalysis, loadDemo, analyzeDocuments, analyzeCSV } = useAnalysis();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+D for demo
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        loadDemoReview();
      }
      // Ctrl+Enter to run analysis
      if (e.ctrlKey && e.key === 'Enter' && !loading) {
        e.preventDefault();
        const ready = intakeMode === "documents" 
          ? Object.values(documents).every(Boolean) 
          : Boolean(csvFile);
        if (ready) handleAnalyze();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [intakeMode, documents, csvFile, loading]);

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
    // Reset state and load demo data
    setIntakeMode("documents");
    setDocuments({ invoice: null, packing_list: null, bill_of_lading: null });
    setCsvFile(null);
    setError("");
    setActiveView("analysis");
    // Load demo data with voice announcement
    loadDemo();
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
    setCsvSettings((current) => ({ ...current, [key]: value }));
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

    try {
      let payload;
      if (intakeMode === "documents") {
        payload = await analyzeDocuments(documents);
      } else {
        payload = await analyzeCSV(csvFile, csvSettings);
      }

      // Transform API response to component state
      const top = payload.top_result;
      const details = top.shipment_details;
      const engineBreakdown = mapBreakdown(top.engine_breakdown);
      const declaredValue = formatCurrency(details.value);
      const comparisonInsight = deriveExpectedRange(declaredValue);

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
          temperature: details.temperature_celsius == null ? "Unknown" : `${details.temperature_celsius} C`,
        },
        engineBreakdown,
        riskFactors: payload.anomalies?.map((a) => a.type) || ["No material anomalies detected"],
        riskTags: top.risk_tags || deriveRiskTags(engineBreakdown, payload.anomalies || []),
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
      setResults((payload.results || []).map(normalizeResult));
      setRiskFilter("ALL");
      setAnomalyRows(
        payload.anomalies?.length
          ? payload.anomalies.map((row, index) => ({
              ...row,
              engine: row.engine || engineLabelFromCategory(row.category),
              absoluteTimestamp: formatAuditTimestamp(row.timestamp, index),
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
    } catch (err) {
      // Error is handled by hook
    }
  }

  function handleApplyAnomalyOverride(override) {
    setAnomalyFeedback((prev) => ({
      ...prev,
      [override.anomalyId]: override,
    }));
  }

  async function handleSaveProfile() {
    await saveProfile(profilePhoto);
    setProfilePhoto(null);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} officerProfile={profile} />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-6 sm:px-6 lg:px-8">
        {activeView === "profile" && (
          <OfficerProfilePanel
            profile={profile}
            form={form}
            onChange={updateField}
            onPhotoChange={setProfilePhoto}
            onSave={handleSaveProfile}
            saving={saving}
            saveMessage={message}
          />
        )}

        {/* OPERATIONS: Command Dashboard Only */}
        {activeView === "operations" && (
          <section>
            <HeroMetric card={heroMetric} />
          </section>
        )}

        {activeView === "operations" && (
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
            <AlertFeed alerts={alerts} />
          </section>
        )}

        {activeView === "operations" && (
          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]">
            <SystemStatus items={systemStatusItems} />
            <QuickActions setActiveView={setActiveView} onExport={handleExport} onLaunchDemo={loadDemoReview} />
          </section>
        )}

        {/* SHIPMENT ANALYSIS: Deep Dive on One Shipment */}
        {activeView === "analysis" && (
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

        {activeView === "analysis" && (
          <section className="grid gap-5">
            <ShipmentDetails details={analysis.shipmentDetails} intakeMode={intakeMode} />
          </section>
        )}

        {activeView === "analysis" && analysis.shipmentDetails.origin !== "Pending" && analysis.shipmentDetails.origin !== "Unknown" && (
          <section className="grid gap-5">
            <RouteIntelligence 
              origin={analysis.shipmentDetails.origin} 
              destination={analysis.shipmentDetails.destination}
              riskScore={analysis.riskScore}
              commodity={analysis.shipmentDetails.commodity}
            />
          </section>
        )}

        {activeView === "analysis" && (
          <section className="grid gap-5 2xl:grid-cols-[1.2fr_0.95fr]">
            <AnomalyTable rows={anomalyRows} analysis={analysis} />
            <IntelligencePanel analysis={analysis} intakeMode={intakeMode} />
          </section>
        )}

        {activeView === "analysis" && anomalyRows.length > 0 && (
          <section className="grid gap-5">
            <AnomalyFeedbackPanel
              anomalies={anomalyRows.map((row, idx) => ({ ...row, id: row.id || `anomaly-${idx}` }))}
              feedbackOverrides={anomalyFeedback}
              onApplyOverride={handleApplyAnomalyOverride}
              officerName={profile.full_name}
            />
          </section>
        )}

        {activeView === "analysis" && <DocumentInsights documents={documentInsights} />}

        {activeView === "analysis" && intakeMode === "documents" && (
          <section className="grid gap-5">
            <DocumentVision 
              documentType="invoice"
              documentData={documentInsights.invoice}
              riskFactors={analysis.riskFactors}
            />
          </section>
        )}

        {activeView === "analysis" && (
          <section className="grid gap-5">
            <PDFReportGenerator 
              analysis={analysis}
              results={results}
              officerProfile={profile}
              documentInsights={documentInsights}
            />
          </section>
        )}

        {/* RISK MONITORING: Live Surveillance */}
        {activeView === "monitoring" && (
          <section className="grid gap-5">
            <AlertFeed alerts={alerts} />
          </section>
        )}

        {activeView === "monitoring" && (
          <section className="grid gap-5">
            <MonitoringTable results={monitoredResults} riskFilter={riskFilter} setRiskFilter={setRiskFilter} />
          </section>
        )}

        {activeView === "monitoring" && (
          <section className="grid gap-5">
            <SanctionsWatchlist />
          </section>
        )}

        {/* AUDIT QUEUE: Physical Inspection Pipeline */}
        {activeView === "audit" && (
          <section className="grid gap-5">
            <AuditQueue rows={auditQueueRows} />
          </section>
        )}
      </main>
    </div>
  );
}
