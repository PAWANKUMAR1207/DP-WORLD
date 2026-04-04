import { useState } from "react";
import { Eye, AlertTriangle, ZoomIn, ZoomOut } from "lucide-react";

export default function DocumentVision({ documentType, documentData, riskFactors }) {
  const [zoom, setZoom] = useState(1);
  const [selectedDetection, setSelectedDetection] = useState(null);

  // Generate mock detections based on risk factors
  const generateDetections = () => {
    const detections = [];
    
    if (riskFactors.some(f => f.toLowerCase().includes("quantity") || f.toLowerCase().includes("mismatch"))) {
      detections.push({
        id: 1,
        type: "quantity",
        label: "Quantity Altered",
        confidence: 94,
        x: 45,
        y: 35,
        width: 25,
        height: 8,
        color: "#ef4444", // red
        icon: "🔢",
        description: "Numbers don't match across documents. Possible alteration detected."
      });
    }
    
    if (riskFactors.some(f => f.toLowerCase().includes("value") || f.toLowerCase().includes("amount"))) {
      detections.push({
        id: 2,
        type: "value",
        label: "Suspicious Value",
        confidence: 87,
        x: 65,
        y: 52,
        width: 20,
        height: 6,
        color: "#f97316", // orange
        icon: "💰",
        description: "Value significantly differs from market rate. Possible under-invoicing."
      });
    }
    
    if (riskFactors.some(f => f.toLowerCase().includes("origin") || f.toLowerCase().includes("country"))) {
      detections.push({
        id: 3,
        type: "origin",
        label: "Origin Discrepancy",
        confidence: 91,
        x: 25,
        y: 68,
        width: 30,
        height: 7,
        color: "#eab308", // yellow
        icon: "🌍",
        description: "Country of origin mismatch. Document shows different origin than shipping records."
      });
    }
    
    if (riskFactors.some(f => f.toLowerCase().includes("signature") || f.toLowerCase().includes("stamp"))) {
      detections.push({
        id: 4,
        type: "signature",
        label: "Signature Anomaly",
        confidence: 82,
        x: 70,
        y: 82,
        width: 18,
        height: 10,
        color: "#a855f7", // purple
        icon: "✍️",
        description: "Signature patterns don't match known samples. Possible forgery."
      });
    }
    
    // Default detection if no specific risks
    if (detections.length === 0 && riskFactors[0] !== "Upload invoice, packing list, and bill of lading to begin review.") {
      detections.push({
        id: 5,
        type: "general",
        label: "Document Analyzed",
        confidence: 75,
        x: 50,
        y: 50,
        width: 40,
        height: 30,
        color: "#22c55e", // green
        icon: "✓",
        description: "Document appears normal. No significant anomalies detected."
      });
    }
    
    return detections;
  };

  const detections = generateDetections();
  const hasHighConfidence = detections.some(d => d.confidence > 85);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-slate-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI Document Vision</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Fraud Detection Overlay
          </h2>
        </div>
        {hasHighConfidence && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{detections.filter(d => d.confidence > 85).length} High Confidence Alerts</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Document Viewer */}
        <div className="relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
          {/* Toolbar */}
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-50"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 bg-white rounded-lg shadow-sm text-sm font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-50"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Document Container */}
          <div 
            className="relative min-h-[400px] flex items-center justify-center p-8 overflow-auto"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Mock Document */}
            <div className="relative bg-white shadow-lg rounded-sm w-[500px] h-[650px] p-8">
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6">
                <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">
                  {documentType === "invoice" ? "Commercial Invoice" : 
                   documentType === "packing_list" ? "Packing List" : 
                   "Bill of Lading"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Document #{documentData?.parsed_fields?.shipment_id || "REF-001"}</p>
              </div>

              {/* Mock Content Lines */}
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                
                <div className="h-8"></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-slate-100 rounded"></div>
                  <div className="h-4 bg-slate-100 rounded"></div>
                  <div className="h-4 bg-slate-100 rounded"></div>
                  <div className="h-4 bg-slate-100 rounded"></div>
                </div>

                <div className="h-8"></div>
                
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
              </div>

              {/* Detection Overlays */}
              {detections.map((detection) => (
                <div
                  key={detection.id}
                  className="absolute cursor-pointer transition-all hover:scale-105"
                  style={{
                    left: `${detection.x}%`,
                    top: `${detection.y}%`,
                    width: `${detection.width}%`,
                    height: `${detection.height}%`,
                    border: `3px solid ${detection.color}`,
                    borderRadius: '4px',
                    backgroundColor: `${detection.color}20`,
                    boxShadow: `0 0 20px ${detection.color}40`,
                    animation: selectedDetection === detection.id ? 'pulse 2s infinite' : 'none'
                  }}
                  onClick={() => setSelectedDetection(detection)}
                >
                  {/* Icon Badge */}
                  <div 
                    className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-md"
                    style={{ backgroundColor: detection.color }}
                  >
                    {detection.icon}
                  </div>
                  
                  {/* Confidence Badge */}
                  <div 
                    className="absolute -bottom-6 left-0 px-2 py-1 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: detection.color }}
                  >
                    {detection.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 mb-2">Detection Types:</p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded bg-red-500"></span> Critical
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded bg-orange-500"></span> Suspicious
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded bg-yellow-500"></span> Warning
              </span>
            </div>
          </div>
        </div>

        {/* Detection Details Panel */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Detected Anomalies ({detections.length})
          </p>
          
          {detections.map((detection) => (
            <div
              key={detection.id}
              onClick={() => setSelectedDetection(detection)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedDetection?.id === detection.id
                  ? 'border-slate-800 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{detection.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{detection.label}</p>
                    <span 
                      className="px-2 py-1 rounded text-white text-xs font-bold"
                      style={{ backgroundColor: detection.color }}
                    >
                      {detection.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{detection.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Click to locate on document</span>
                    {selectedDetection?.id === detection.id && (
                      <span className="text-xs text-blue-600 font-medium">← Highlighted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {detections.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400">No document uploaded yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Upload documents to see AI vision analysis
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {detections.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{detections.length}</p>
            <p className="text-xs text-slate-600">Issues Found</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">
              {Math.round(detections.reduce((a, b) => a + b.confidence, 0) / detections.length)}%
            </p>
            <p className="text-xs text-slate-600">Avg Confidence</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {detections.filter(d => d.confidence > 85).length}
            </p>
            <p className="text-xs text-slate-600">High Risk</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{documentType}</p>
            <p className="text-xs text-slate-600">Document Type</p>
          </div>
        </div>
      )}
    </section>
  );
}
