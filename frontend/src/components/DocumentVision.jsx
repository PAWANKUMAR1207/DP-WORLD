import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Eye, AlertTriangle, ZoomIn, ZoomOut, FileSearch,
  Pencil, Type, Highlighter, Trash2, Download, ChevronLeft, ChevronRight,
} from "lucide-react";

// Vite-idiomatic worker URL — resolves correctly in both dev and prod
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const zonePalette = {
  critical: { color: "#ef4444", label: "Critical" },
  suspicious: { color: "#f97316", label: "Suspicious" },
  warning: { color: "#eab308", label: "Warning" },
  clear: { color: "#22c55e", label: "Clear" },
};

const documentTabs = [
  { key: "invoice", label: "Commercial Invoice" },
  { key: "packing_list", label: "Packing List" },
  { key: "bill_of_lading", label: "Bill of Lading" },
];

const EDIT_TOOLS = [
  { key: "text", icon: Type, label: "Add Text" },
  { key: "highlight", icon: Highlighter, label: "Highlight" },
];

export default function DocumentVision({ documentType, documentData, riskFactors, documents, uploadedFiles }) {
  const [activeDocument, setActiveDocument] = useState(documentType || "invoice");
  const [zoom, setZoom] = useState(1.2);
  const [pdfDoc, setPdfDoc] = useState(null);       // pdfjs document
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("text");
  const [annotations, setAnnotations] = useState({});  // { docKey: [{id, tool, x, y, text, page, color, w, h}] }
  const [editingAnnotation, setEditingAnnotation] = useState(null); // id of annotation being typed
  const [pendingInput, setPendingInput] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [pdfPageSize, setPdfPageSize] = useState({ width: 1, height: 1 }); // unscaled PDF page size
  const [pdfError, setPdfError] = useState(null);

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const activeFile = uploadedFiles?.[activeDocument];
  const activeData = documents?.[activeDocument] || documentData || {};
  const parsedFields = activeData?.parsed_fields || {};
  const textExcerpt = activeData?.text_excerpt || "No extracted text available.";
  const docAnnotations = annotations[activeDocument] || [];
  const highlightedRiskCount = (riskFactors || []).length;

  // Load PDF from File object
  useEffect(() => {
    if (!activeFile) { setPdfDoc(null); setPdfError(null); return; }
    let cancelled = false;
    setPdfDoc(null);
    setPdfError(null);
    const reader = new FileReader();
    reader.onerror = () => setPdfError("Could not read file.");
    reader.onload = async (e) => {
      if (cancelled) return;
      try {
        const typedArray = new Uint8Array(e.target.result);
        const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);
      } catch (err) {
        if (!cancelled) setPdfError(err?.message || "Failed to load PDF.");
      }
    };
    reader.readAsArrayBuffer(activeFile);
    return () => { cancelled = true; };
  }, [activeFile]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      const page = await pdfDoc.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: zoom });
      setPdfPageSize({ width: viewport.width / zoom, height: viewport.height / zoom });

      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (viewerRef.current) {
        setViewerSize({ width: viewport.width, height: viewport.height });
      }

      const ctx = canvas.getContext("2d");
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") console.warn(err);
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, zoom]);

  // Handle click on PDF canvas to place annotation
  const handleCanvasClick = useCallback((e) => {
    if (!editMode || !canvasRef.current) return;
    if (editingAnnotation) return; // finish current edit first

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;   // % of canvas width
    const y = ((e.clientY - rect.top) / rect.height) * 100;   // % of canvas height

    const id = `ann-${Date.now()}`;
    const newAnn = {
      id, tool: activeTool, x, y, text: "", page: pageNum,
      color: activeTool === "highlight" ? "#fde047" : "#1e293b", w: 30, h: 5,
    };

    setAnnotations((prev) => ({
      ...prev,
      [activeDocument]: [...(prev[activeDocument] || []), newAnn],
    }));

    if (activeTool === "text") {
      setEditingAnnotation(id);
      setPendingInput("");
    }
  }, [editMode, activeTool, editingAnnotation, activeDocument, pageNum]);

  const commitTextEdit = useCallback(() => {
    if (!editingAnnotation) return;
    if (!pendingInput.trim()) {
      // remove empty annotation
      setAnnotations((prev) => ({
        ...prev,
        [activeDocument]: (prev[activeDocument] || []).filter((a) => a.id !== editingAnnotation),
      }));
    } else {
      setAnnotations((prev) => ({
        ...prev,
        [activeDocument]: (prev[activeDocument] || []).map((a) =>
          a.id === editingAnnotation ? { ...a, text: pendingInput.trim() } : a
        ),
      }));
    }
    setEditingAnnotation(null);
    setPendingInput("");
  }, [editingAnnotation, pendingInput, activeDocument]);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations((prev) => ({
      ...prev,
      [activeDocument]: (prev[activeDocument] || []).filter((a) => a.id !== id),
    }));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  }, [activeDocument, selectedAnnotationId]);

  // Save annotated PDF via pdf-lib
  const saveAnnotatedPDF = useCallback(async () => {
    if (!activeFile) return;
    const bytes = await activeFile.arrayBuffer();
    const pdfLibDoc = await PDFDocument.load(bytes);
    const helvetica = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfLibDoc.getPages();

    const pageAnnotations = (annotations[activeDocument] || []).filter((a) => a.page === pageNum);

    for (const ann of pageAnnotations) {
      const page = pages[ann.page - 1];
      if (!page) continue;
      const { width: pWidth, height: pHeight } = page.getSize();

      const absX = (ann.x / 100) * pWidth;
      const absY = pHeight - (ann.y / 100) * pHeight; // PDF y is from bottom

      if (ann.tool === "highlight") {
        page.drawRectangle({
          x: absX,
          y: absY - 14,
          width: (ann.w / 100) * pWidth,
          height: 14,
          color: rgb(0.99, 0.87, 0.28),
          opacity: 0.5,
        });
      } else if (ann.tool === "text" && ann.text) {
        page.drawText(ann.text, {
          x: absX,
          y: absY - 10,
          size: 11,
          font: helvetica,
          color: rgb(0.07, 0.11, 0.16),
        });
      }
    }

    const modifiedBytes = await pdfLibDoc.save();
    const blob = new Blob([modifiedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited_${activeFile.name}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFile, annotations, activeDocument, pageNum]);

  const switchDocument = (key) => {
    if (editingAnnotation) commitTextEdit();
    setActiveDocument(key);
    setPageNum(1);
    setSelectedAnnotationId(null);
    setEditingAnnotation(null);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-slate-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Document Review Overlay</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">PDF Viewer &amp; Editor</h2>
          <p className="mt-1 text-sm text-slate-600">
            {activeFile
              ? "View and annotate the uploaded PDF. Switch to Edit Mode to add text or highlights, then save."
              : "Upload documents above to view them here."}
          </p>
        </div>
        {highlightedRiskCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{highlightedRiskCount} risk factors</span>
          </div>
        )}
      </div>

      {/* Document tabs */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {documentTabs.map((tab) => {
          const file = uploadedFiles?.[tab.key];
          const active = activeDocument === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchDocument(tab.key)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-white" : "text-slate-900"}`}>{tab.label}</p>
              <p className={`mt-1 truncate text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                {file ? file.name : "No file uploaded"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* PDF Viewer */}
        <div className="flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            {/* Zoom */}
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-100">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[48px] text-center text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-100">
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="mx-1 h-6 w-px bg-slate-300" />

            {/* Page nav */}
            {totalPages > 1 && (
              <>
                <button onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum === 1} className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-100 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium">{pageNum} / {totalPages}</span>
                <button onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={pageNum === totalPages} className="rounded-lg bg-white p-2 shadow-sm hover:bg-slate-100 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="mx-1 h-6 w-px bg-slate-300" />
              </>
            )}

            {/* Edit mode toggle */}
            <button
              onClick={() => { setEditMode((v) => !v); if (editingAnnotation) commitTextEdit(); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition ${
                editMode ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Pencil className="h-4 w-4" />
              {editMode ? "Editing" : "Edit Mode"}
            </button>

            {/* Edit tools (visible only in edit mode) */}
            {editMode && (
              <>
                {EDIT_TOOLS.map((tool) => (
                  <button
                    key={tool.key}
                    onClick={() => setActiveTool(tool.key)}
                    title={tool.label}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition ${
                      activeTool === tool.key ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                  </button>
                ))}
              </>
            )}

            <div className="ml-auto" />

            {/* Save */}
            {activeFile && (
              <button
                onClick={saveAnnotatedPDF}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Save PDF
              </button>
            )}
          </div>

          {/* Edit mode hint */}
          {editMode && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
              {activeTool === "text"
                ? "Click anywhere on the PDF to add a text annotation. Press Enter to confirm."
                : "Click anywhere on the PDF to add a highlight box."}
            </div>
          )}

          {/* Canvas area */}
          <div
            className="relative overflow-auto rounded-2xl border border-slate-200 bg-slate-100"
            style={{ minHeight: 480 }}
          >
            {activeFile && pdfDoc ? (
              <div
                ref={viewerRef}
                className="relative mx-auto"
                style={{ width: viewerSize.width || "100%", cursor: editMode ? "crosshair" : "default" }}
                onClick={handleCanvasClick}
              >
                <canvas ref={canvasRef} className="block" />

                {/* Annotation overlays */}
                <div className="pointer-events-none absolute inset-0">
                  {docAnnotations.filter((a) => a.page === pageNum).map((ann) => (
                    <div
                      key={ann.id}
                      className="pointer-events-auto absolute"
                      style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                      onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}
                    >
                      {ann.tool === "highlight" ? (
                        <div
                          style={{
                            width: `${ann.w}vw`,
                            height: "1.2rem",
                            backgroundColor: "#fde04780",
                            border: selectedAnnotationId === ann.id ? "2px dashed #ca8a04" : "none",
                            borderRadius: 3,
                          }}
                        />
                      ) : ann.id === editingAnnotation ? (
                        <input
                          autoFocus
                          value={pendingInput}
                          onChange={(e) => setPendingInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitTextEdit(); if (e.key === "Escape") { setEditingAnnotation(null); setPendingInput(""); deleteAnnotation(ann.id); } }}
                          onBlur={commitTextEdit}
                          onClick={(e) => e.stopPropagation()}
                          className="min-w-[120px] rounded border border-blue-400 bg-white px-2 py-1 text-sm shadow-lg outline-none"
                          placeholder="Type and press Enter"
                        />
                      ) : (
                        <div
                          className={`cursor-pointer rounded px-2 py-1 text-sm font-medium shadow-sm ${
                            selectedAnnotationId === ann.id ? "ring-2 ring-blue-500" : ""
                          }`}
                          style={{ backgroundColor: "#ffffffcc", color: ann.color, border: "1px solid #e2e8f0" }}
                        >
                          {ann.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-slate-400">
                <FileSearch className="h-12 w-12" />
                <p className="text-sm font-medium">
                  {pdfError
                    ? `PDF error: ${pdfError}`
                    : activeFile
                    ? "Loading PDF..."
                    : "No PDF uploaded for this document type"}
                </p>
                {activeFile && !pdfError && (
                  <p className="text-xs text-slate-400">{activeFile.name} ({Math.round(activeFile.size / 1024)} KB)</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Annotations list */}
          {docAnnotations.filter((a) => a.page === pageNum).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Annotations — Page {pageNum} ({docAnnotations.filter((a) => a.page === pageNum).length})
              </p>
              <div className="mt-3 space-y-2">
                {docAnnotations.filter((a) => a.page === pageNum).map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedAnnotationId(ann.id)}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      selectedAnnotationId === ann.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                          ann.tool === "highlight" ? "bg-yellow-200 text-yellow-800" : "bg-slate-200 text-slate-700"
                        }`}>{ann.tool}</span>
                      </div>
                      {ann.text && <p className="mt-1 text-sm text-slate-700">{ann.text}</p>}
                      <p className="mt-1 text-xs text-slate-400">x:{Math.round(ann.x)}% y:{Math.round(ann.y)}%</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted fields */}
          {Object.keys(parsedFields).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Extracted Fields</p>
              <div className="mt-3 space-y-2">
                {Object.entries(parsedFields).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{key.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text excerpt */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-slate-600" />
              <p className="text-sm font-semibold text-slate-900">Extracted Text Snippet</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{textExcerpt}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard value={docAnnotations.length} label="Total Annotations" tone="text-slate-900" />
            <StatCard value={totalPages} label="PDF Pages" tone="text-slate-900" />
            <StatCard value={highlightedRiskCount} label="Risk Factors" tone="text-amber-600" />
            <StatCard value={activeFile ? "Loaded" : "None"} label="File Status" tone={activeFile ? "text-emerald-600" : "text-slate-400"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, tone }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}
