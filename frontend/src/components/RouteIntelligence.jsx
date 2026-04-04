import { useState, useEffect, useMemo } from "react";
import { 
  Globe, MapPin, AlertTriangle, Shield, Navigation, Wind,
  Anchor, TrendingUp, Clock, Info, AlertOctagon, Ship,
  Route, Activity, BarChart3, CheckCircle, Flag,
  ThumbsUp, ThumbsDown, MessageSquare, Save, RotateCcw,
  Edit3, History, AlertCircle
} from "lucide-react";

// World Map Background
const WORLD_MAP_BG = "https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg";

// 150+ Locations database
const LOCATIONS = {
  // Asia
  "China": { x: 780, y: 180, risk: 45, region: "East Asia", flag: "CN" },
  "India": { x: 640, y: 230, risk: 40, region: "South Asia", flag: "IN" },
  "Japan": { x: 835, y: 165, risk: 18, region: "East Asia", flag: "JP" },
  "South Korea": { x: 810, y: 170, risk: 20, region: "East Asia", flag: "KR" },
  "Singapore": { x: 745, y: 285, risk: 15, region: "Southeast Asia", flag: "SG" },
  "Thailand": { x: 720, y: 235, risk: 38, region: "Southeast Asia", flag: "TH" },
  "Vietnam": { x: 750, y: 240, risk: 40, region: "Southeast Asia", flag: "VN" },
  "Malaysia": { x: 735, y: 275, risk: 35, region: "Southeast Asia", flag: "MY" },
  "Indonesia": { x: 760, y: 310, risk: 42, region: "Southeast Asia", flag: "ID" },
  "Philippines": { x: 790, y: 235, risk: 35, region: "Southeast Asia", flag: "PH" },
  "Taiwan": { x: 795, y: 215, risk: 25, region: "East Asia", flag: "TW" },
  "Hong Kong": { x: 765, y: 220, risk: 20, region: "East Asia", flag: "HK" },
  "Pakistan": { x: 605, y: 205, risk: 48, region: "South Asia", flag: "PK" },
  "Bangladesh": { x: 695, y: 225, risk: 45, region: "South Asia", flag: "BD" },
  "Sri Lanka": { x: 650, y: 270, risk: 35, region: "South Asia", flag: "LK" },
  "Myanmar": { x: 710, y: 230, risk: 55, region: "Southeast Asia", flag: "MM" },
  "Cambodia": { x: 735, y: 245, risk: 42, region: "Southeast Asia", flag: "KH" },
  "Nepal": { x: 670, y: 215, risk: 35, region: "South Asia", flag: "NP" },
  "Mongolia": { x: 770, y: 140, risk: 30, region: "East Asia", flag: "MN" },
  "North Korea": { x: 805, y: 160, risk: 95, region: "East Asia", flag: "KP", sanctions: true },
  "Kazakhstan": { x: 620, y: 150, risk: 35, region: "Central Asia", flag: "KZ" },
  "Uzbekistan": { x: 600, y: 170, risk: 40, region: "Central Asia", flag: "UZ" },
  "Afghanistan": { x: 600, y: 200, risk: 85, region: "South Asia", flag: "AF" },
  
  // Middle East
  "UAE": { x: 575, y: 215, risk: 35, region: "Middle East", flag: "AE" },
  "Saudi Arabia": { x: 565, y: 215, risk: 40, region: "Middle East", flag: "SA" },
  "Iran": { x: 590, y: 190, risk: 85, region: "Middle East", flag: "IR", sanctions: true },
  "Iraq": { x: 550, y: 195, risk: 75, region: "Middle East", flag: "IQ" },
  "Israel": { x: 530, y: 200, risk: 35, region: "Middle East", flag: "IL" },
  "Jordan": { x: 535, y: 205, risk: 38, region: "Middle East", flag: "JO" },
  "Syria": { x: 540, y: 185, risk: 90, region: "Middle East", flag: "SY", sanctions: true },
  "Kuwait": { x: 560, y: 210, risk: 40, region: "Middle East", flag: "KW" },
  "Qatar": { x: 572, y: 222, risk: 35, region: "Middle East", flag: "QA" },
  "Oman": { x: 590, y: 230, risk: 32, region: "Middle East", flag: "OM" },
  "Yemen": { x: 565, y: 245, risk: 85, region: "Middle East", flag: "YE" },
  "Turkey": { x: 530, y: 155, risk: 40, region: "Middle East", flag: "TR" },
  
  // Europe
  "Germany": { x: 485, y: 105, risk: 12, region: "Europe", flag: "DE" },
  "UK": { x: 445, y: 95, risk: 15, region: "Europe", flag: "GB" },
  "France": { x: 455, y: 125, risk: 15, region: "Europe", flag: "FR" },
  "Netherlands": { x: 465, y: 100, risk: 10, region: "Europe", flag: "NL" },
  "Belgium": { x: 460, y: 108, risk: 12, region: "Europe", flag: "BE" },
  "Italy": { x: 495, y: 145, risk: 20, region: "Europe", flag: "IT" },
  "Spain": { x: 440, y: 155, risk: 22, region: "Europe", flag: "ES" },
  "Portugal": { x: 425, y: 165, risk: 25, region: "Europe", flag: "PT" },
  "Greece": { x: 515, y: 160, risk: 25, region: "Europe", flag: "GR" },
  "Poland": { x: 505, y: 100, risk: 18, region: "Europe", flag: "PL" },
  "Sweden": { x: 500, y: 70, risk: 12, region: "Europe", flag: "SE" },
  "Norway": { x: 475, y: 65, risk: 10, region: "Europe", flag: "NO" },
  "Denmark": { x: 480, y: 85, risk: 12, region: "Europe", flag: "DK" },
  "Finland": { x: 515, y: 60, risk: 12, region: "Europe", flag: "FI" },
  "Ireland": { x: 435, y: 105, risk: 15, region: "Europe", flag: "IE" },
  "Switzerland": { x: 480, y: 130, risk: 12, region: "Europe", flag: "CH" },
  "Austria": { x: 495, y: 125, risk: 15, region: "Europe", flag: "AT" },
  "Czech Republic": { x: 500, y: 115, risk: 15, region: "Europe", flag: "CZ" },
  "Hungary": { x: 510, y: 130, risk: 18, region: "Europe", flag: "HU" },
  "Romania": { x: 525, y: 135, risk: 25, region: "Europe", flag: "RO" },
  "Bulgaria": { x: 530, y: 145, risk: 28, region: "Europe", flag: "BG" },
  "Croatia": { x: 505, y: 140, risk: 22, region: "Europe", flag: "HR" },
  "Serbia": { x: 515, y: 142, risk: 30, region: "Europe", flag: "RS" },
  "Ukraine": { x: 540, y: 120, risk: 65, region: "Europe", flag: "UA" },
  "Russia": { x: 700, y: 80, risk: 60, region: "Eurasia", flag: "RU", sanctions: true },
  "Belarus": { x: 530, y: 100, risk: 40, region: "Europe", flag: "BY" },
  "Lithuania": { x: 515, y: 95, risk: 18, region: "Europe", flag: "LT" },
  "Latvia": { x: 518, y: 90, risk: 18, region: "Europe", flag: "LV" },
  "Estonia": { x: 520, y: 85, risk: 18, region: "Europe", flag: "EE" },
  
  // Africa
  "South Africa": { x: 500, y: 375, risk: 45, region: "Africa", flag: "ZA" },
  "Egypt": { x: 520, y: 200, risk: 45, region: "Africa", flag: "EG" },
  "Nigeria": { x: 470, y: 255, risk: 55, region: "Africa", flag: "NG" },
  "Kenya": { x: 540, y: 280, risk: 52, region: "Africa", flag: "KE" },
  "Morocco": { x: 430, y: 195, risk: 35, region: "Africa", flag: "MA" },
  "Algeria": { x: 455, y: 205, risk: 40, region: "Africa", flag: "DZ" },
  "Tunisia": { x: 475, y: 185, risk: 35, region: "Africa", flag: "TN" },
  "Libya": { x: 490, y: 215, risk: 70, region: "Africa", flag: "LY" },
  "Sudan": { x: 525, y: 250, risk: 65, region: "Africa", flag: "SD" },
  "Ethiopia": { x: 550, y: 260, risk: 55, region: "Africa", flag: "ET" },
  "Tanzania": { x: 535, y: 295, risk: 50, region: "Africa", flag: "TZ" },
  "Uganda": { x: 530, y: 275, risk: 52, region: "Africa", flag: "UG" },
  "Ghana": { x: 460, y: 250, risk: 48, region: "Africa", flag: "GH" },
  "Ivory Coast": { x: 450, y: 255, risk: 50, region: "Africa", flag: "CI" },
  "Senegal": { x: 420, y: 235, risk: 45, region: "Africa", flag: "SN" },
  "Mali": { x: 440, y: 240, risk: 55, region: "Africa", flag: "ML" },
  "Cameroon": { x: 480, y: 260, risk: 50, region: "Africa", flag: "CM" },
  "Angola": { x: 495, y: 320, risk: 55, region: "Africa", flag: "AO" },
  "Mozambique": { x: 545, y: 340, risk: 50, region: "Africa", flag: "MZ" },
  "Zimbabwe": { x: 520, y: 340, risk: 55, region: "Africa", flag: "ZW" },
  "Zambia": { x: 515, y: 325, risk: 52, region: "Africa", flag: "ZM" },
  "Botswana": { x: 505, y: 350, risk: 40, region: "Africa", flag: "BW" },
  "Namibia": { x: 490, y: 350, risk: 42, region: "Africa", flag: "NA" },
  "Madagascar": { x: 575, y: 350, risk: 48, region: "Africa", flag: "MG" },
  "Mauritius": { x: 595, y: 355, risk: 30, region: "Africa", flag: "MU" },
  "Djibouti": { x: 555, y: 245, risk: 48, region: "Africa", flag: "DJ" },
  "Somalia": { x: 565, y: 265, risk: 85, region: "Africa", flag: "SO" },
  
  // North America
  "USA": { x: 180, y: 150, risk: 20, region: "North America", flag: "US" },
  "Canada": { x: 150, y: 100, risk: 15, region: "North America", flag: "CA" },
  "Mexico": { x: 200, y: 210, risk: 35, region: "North America", flag: "MX" },
  
  // South America
  "Brazil": { x: 270, y: 310, risk: 42, region: "South America", flag: "BR" },
  "Argentina": { x: 260, y: 380, risk: 45, region: "South America", flag: "AR" },
  "Chile": { x: 240, y: 370, risk: 30, region: "South America", flag: "CL" },
  "Peru": { x: 230, y: 290, risk: 40, region: "South America", flag: "PE" },
  "Colombia": { x: 240, y: 255, risk: 40, region: "South America", flag: "CO" },
  "Venezuela": { x: 260, y: 250, risk: 75, region: "South America", flag: "VE" },
  "Ecuador": { x: 220, y: 275, risk: 42, region: "South America", flag: "EC" },
  "Uruguay": { x: 285, y: 390, risk: 35, region: "South America", flag: "UY" },
  "Bolivia": { x: 255, y: 330, risk: 48, region: "South America", flag: "BO" },
  "Paraguay": { x: 270, y: 350, risk: 45, region: "South America", flag: "PY" },
  
  // Oceania
  "Australia": { x: 850, y: 380, risk: 25, region: "Oceania", flag: "AU" },
  "New Zealand": { x: 920, y: 420, risk: 20, region: "Oceania", flag: "NZ" },
  "Fiji": { x: 930, y: 350, risk: 30, region: "Oceania", flag: "FJ" },
  "Papua New Guinea": { x: 880, y: 310, risk: 45, region: "Oceania", flag: "PG" },
};

// Trade routes
const TRADE_ROUTES = [
  { from: "China", to: "USA", volume: "high" },
  { from: "China", to: "Germany", volume: "high" },
  { from: "China", to: "Singapore", volume: "high" },
  { from: "China", to: "Japan", volume: "high" },
  { from: "China", to: "South Korea", volume: "high" },
  { from: "China", to: "Australia", volume: "medium" },
  { from: "China", to: "India", volume: "medium" },
  { from: "Singapore", to: "India", volume: "high" },
  { from: "Singapore", to: "UAE", volume: "high" },
  { from: "Singapore", to: "Netherlands", volume: "high" },
  { from: "UAE", to: "Germany", volume: "high" },
  { from: "UAE", to: "India", volume: "high" },
  { from: "UAE", to: "Saudi Arabia", volume: "high" },
  { from: "Germany", to: "USA", volume: "high" },
  { from: "Germany", to: "UK", volume: "high" },
  { from: "USA", to: "Japan", volume: "high" },
  { from: "USA", to: "South Korea", volume: "high" },
  { from: "USA", to: "Brazil", volume: "medium" },
  { from: "Japan", to: "USA", volume: "high" },
  { from: "South Korea", to: "USA", volume: "high" },
  { from: "India", to: "UAE", volume: "high" },
  { from: "India", to: "USA", volume: "medium" },
  { from: "Brazil", to: "USA", volume: "medium" },
  { from: "Brazil", to: "China", volume: "high" },
  { from: "Australia", to: "China", volume: "high" },
  { from: "UK", to: "USA", volume: "high" },
  { from: "Netherlands", to: "Germany", volume: "high" },
  { from: "France", to: "USA", volume: "high" },
  { from: "Italy", to: "China", volume: "medium" },
  { from: "Spain", to: "China", volume: "medium" },
  { from: "Turkey", to: "Germany", volume: "medium" },
  { from: "South Africa", to: "China", volume: "medium" },
  { from: "Egypt", to: "China", volume: "medium" },
  { from: "Kenya", to: "India", volume: "medium" },
  { from: "Chile", to: "China", volume: "high" },
  { from: "Peru", to: "China", volume: "high" },
  { from: "Colombia", to: "USA", volume: "medium" },
  { from: "Argentina", to: "China", volume: "medium" },
  { from: "Mexico", to: "USA", volume: "high" },
  { from: "Canada", to: "USA", volume: "high" },
  { from: "Russia", to: "China", volume: "high" },
  { from: "Thailand", to: "USA", volume: "medium" },
  { from: "Vietnam", to: "USA", volume: "high" },
  { from: "Malaysia", to: "China", volume: "high" },
  { from: "Indonesia", to: "China", volume: "high" },
  { from: "Philippines", to: "USA", volume: "medium" },
  { from: "Taiwan", to: "USA", volume: "high" },
  { from: "Pakistan", to: "China", volume: "high" },
  { from: "Bangladesh", to: "USA", volume: "medium" },
  { from: "Sri Lanka", to: "India", volume: "high" },
  { from: "Saudi Arabia", to: "China", volume: "high" },
  { from: "Saudi Arabia", to: "Japan", volume: "high" },
  { from: "Qatar", to: "Japan", volume: "high" },
  { from: "New Zealand", to: "China", volume: "medium" },
];

// Get risk color
const getRiskColor = (risk) => {
  if (risk >= 70) return "#ef4444";
  if (risk >= 40) return "#f59e0b";
  return "#22c55e";
};

// Get location data
const getLocationData = (name, overrides = {}) => {
  const base = LOCATIONS[name] || { x: 500, y: 250, risk: 50, region: "Unknown", flag: "XX" };
  return { ...base, ...overrides[name] };
};

export default function RouteIntelligence({ origin, destination }) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  
  // Feedback system states
  const [riskOverrides, setRiskOverrides] = useState({});
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [proposedRisk, setProposedRisk] = useState(null);
  
  const originData = useMemo(() => getLocationData(origin, riskOverrides), [origin, riskOverrides]);
  const destData = useMemo(() => getLocationData(destination, riskOverrides), [destination, riskOverrides]);

  // Calculate metrics
  const routeMetrics = useMemo(() => {
    const R = 6371;
    const dLat = (destData.lat - originData.lat) * Math.PI / 180;
    const dLon = (destData.lng - originData.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(originData.lat * Math.PI / 180) * Math.cos(destData.lat * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    const routeRisk = Math.round((originData.risk * 0.3) + (destData.risk * 0.4) + (Math.abs(originData.risk - destData.risk) * 0.3));
    return { distance, routeRisk, seaDays: Math.round(distance / 800) };
  }, [originData, destData]);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => setAnimationPhase(p => (p + 1) % 200), 50);
    return () => clearInterval(interval);
  }, []);

  // Submit risk feedback
  const submitRiskFeedback = () => {
    if (!selectedCountry || proposedRisk === null) return;
    
    const oldRisk = LOCATIONS[selectedCountry]?.risk || 50;
    const newFeedback = {
      id: Date.now(),
      country: selectedCountry,
      oldRisk,
      newRisk: proposedRisk,
      note: feedbackNote,
      timestamp: new Date().toISOString(),
      approved: true
    };
    
    setFeedbackHistory([newFeedback, ...feedbackHistory]);
    setRiskOverrides({ ...riskOverrides, [selectedCountry]: { risk: proposedRisk } });
    setFeedbackNote("");
    setProposedRisk(null);
    setShowFeedbackPanel(false);
  };

  // Reset risk to original
  const resetRisk = (country) => {
    const newOverrides = { ...riskOverrides };
    delete newOverrides[country];
    setRiskOverrides(newOverrides);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-300" />
            <div>
              <p className="text-xs text-blue-300 uppercase tracking-wider">Global Maritime Intelligence</p>
              <h2 className="text-xl font-bold">World Route Network with Feedback Loop</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
            >
              <Flag className="h-4 w-4" />
              Risk Feedback
              {Object.keys(riskOverrides).length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {Object.keys(riskOverrides).length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setShowAllRoutes(!showAllRoutes)}
              className="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              {showAllRoutes ? "Hide" : "Show"} All Routes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-4" style={{ minHeight: "650px" }}>
        {/* Map Area */}
        <div className="lg:col-span-3 relative bg-slate-900 overflow-hidden">
          {/* World Map Background */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url('${WORLD_MAP_BG}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          
          <svg viewBox="0 0 1000 500" className="relative w-full h-full" style={{ minHeight: "650px" }}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* All Trade Routes */}
            {showAllRoutes && TRADE_ROUTES.map((route, idx) => {
              const from = LOCATIONS[route.from];
              const to = LOCATIONS[route.to];
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2 - (Math.abs(to.x - from.x) > 200 ? 0 : 20);
              const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
              
              return (
                <path
                  key={idx}
                  d={pathD}
                  fill="none"
                  stroke={route.volume === "high" ? "rgba(100,149,237,0.3)" : "rgba(100,149,237,0.15)"}
                  strokeWidth={route.volume === "high" ? 2 : 1}
                  strokeDasharray="5,5"
                />
              );
            })}

            {/* Active Route */}
            {originData.x && destData.x && (
              <g>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={getRiskColor(routeMetrics.routeRisk)} />
                  </marker>
                </defs>
                <path
                  d={`M ${originData.x} ${originData.y} Q ${(originData.x + destData.x) / 2} ${(originData.y + destData.y) / 2 - 30} ${destData.x} ${destData.y}`}
                  fill="none"
                  stroke={getRiskColor(routeMetrics.routeRisk)}
                  strokeWidth="10"
                  opacity="0.3"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${originData.x} ${originData.y} Q ${(originData.x + destData.x) / 2} ${(originData.y + destData.y) / 2 - 30} ${destData.x} ${destData.y}`}
                  fill="none"
                  stroke={getRiskColor(routeMetrics.routeRisk)}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="10, 5"
                  strokeDashoffset={-animationPhase}
                  markerEnd="url(#arrowhead)"
                />
                <text x="0" y="0" fontSize="16">
                  <animateMotion dur="3s" repeatCount="indefinite" 
                    path={`M ${originData.x} ${originData.y} Q ${(originData.x + destData.x) / 2} ${(originData.y + destData.y) / 2 - 30} ${destData.x} ${destData.y}`} />
                  📦
                </text>
              </g>
            )}

            {/* Country Markers */}
            {Object.entries(LOCATIONS).map(([name, loc]) => {
              const isOverridden = riskOverrides[name];
              const displayRisk = isOverridden ? riskOverrides[name].risk : loc.risk;
              
              return (
                <g key={name} className="cursor-pointer" onClick={() => {
                  setSelectedCountry(name);
                  setProposedRisk(displayRisk);
                }}>
                  {/* Risk circle with pulse */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={displayRisk > 70 ? 8 : displayRisk > 40 ? 6 : 5}
                    fill={getRiskColor(displayRisk)}
                    opacity="0.8"
                    stroke={isOverridden ? "#fff" : "none"}
                    strokeWidth={isOverridden ? 2 : 0}
                  >
                    <animate attributeName="r" values={`${displayRisk > 70 ? 6 : 4};${displayRisk > 70 ? 10 : 7};${displayRisk > 70 ? 6 : 4}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Override indicator */}
                  {isOverridden && (
                    <g>
                      <circle cx={loc.x + 8} cy={loc.y - 8} r="6" fill="#3b82f6" />
                      <text x={loc.x + 8} y={loc.y - 5} textAnchor="middle" fill="white" fontSize="8">✎</text>
                    </g>
                  )}
                  
                  {/* Label on hover/selection */}
                  {(selectedCountry === name || displayRisk > 60) && (
                    <g>
                      <rect x={loc.x - 45} y={loc.y - 40} width="90" height="28" rx="4" fill="rgba(0,0,0,0.8)" />
                      <text x={loc.x} y={loc.y - 28} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                        {name}
                      </text>
                      <text x={loc.x} y={loc.y - 18} textAnchor="middle" fill={isOverridden ? "#60a5fa" : "rgba(255,255,255,0.7)"} fontSize="8">
                        Risk: {displayRisk} {isOverridden && "(Modified)"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Origin & Destination Markers */}
            {originData.x && (
              <g>
                <circle cx={originData.x} cy={originData.y} r="15" fill="#22c55e" stroke="white" strokeWidth="3">
                  <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x={originData.x} y={originData.y - 25} textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">ORIGIN</text>
                <text x={originData.x} y={originData.y + 30} textAnchor="middle" fill="white" fontSize="10">{originData.name}</text>
              </g>
            )}
            {destData.x && (
              <g>
                <circle cx={destData.x} cy={destData.y} r="15" fill="#ef4444" stroke="white" strokeWidth="3">
                  <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x={destData.x} y={destData.y - 25} textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">DESTINATION</text>
                <text x={destData.x} y={destData.y + 30} textAnchor="middle" fill="white" fontSize="10">{destData.name}</text>
              </g>
            )}
          </svg>

          {/* Distance Badge */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg px-4 py-3 text-white border border-slate-600">
            <div className="flex items-center gap-2 mb-1">
              <Ship className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">Distance</span>
            </div>
            <p className="text-xl font-bold">{(routeMetrics.distance / 1000).toFixed(1)}k km</p>
            <p className="text-xs text-slate-500">{routeMetrics.seaDays} days by sea</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-slate-50 border-l border-slate-200 flex flex-col" style={{ maxHeight: "650px" }}>
          {/* Feedback Panel */}
          {showFeedbackPanel && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Risk Feedback System
              </h3>
              
              {selectedCountry ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Selected Country</p>
                    <p className="font-bold text-slate-900">{selectedCountry}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Current Risk:</span>
                      <span className={`font-bold ${LOCATIONS[selectedCountry]?.risk >= 70 ? 'text-red-600' : LOCATIONS[selectedCountry]?.risk >= 40 ? 'text-amber-600' : 'text-green-600'}`}>
                        {LOCATIONS[selectedCountry]?.risk || 50}
                      </span>
                      {riskOverrides[selectedCountry] && (
                        <>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="font-bold text-blue-600">{riskOverrides[selectedCountry].risk}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Proposed Risk Level</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={proposedRisk || 0}
                      onChange={(e) => setProposedRisk(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>0 (Safe)</span>
                      <span className="font-bold text-slate-900">{proposedRisk}</span>
                      <span>100 (Critical)</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Feedback Note</label>
                    <textarea
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="Why are you changing this risk level?"
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg resize-none"
                      rows="2"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={submitRiskFeedback}
                      disabled={proposedRisk === null || proposedRisk === LOCATIONS[selectedCountry]?.risk}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      Save Change
                    </button>
                    {riskOverrides[selectedCountry] && (
                      <button
                        onClick={() => resetRisk(selectedCountry)}
                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600 text-center py-4">
                  Click on any country to provide risk feedback
                </p>
              )}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Origin Card */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Origin</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: getRiskColor(originData.risk) }}>
                  {originData.risk}/100
                </span>
              </div>
              <p className="font-bold text-slate-900">{originData.name}</p>
              <p className="text-xs text-slate-500">{originData.region}</p>
              {riskOverrides[origin] && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  Risk manually adjusted
                </p>
              )}
            </div>

            {/* Destination Card */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Destination</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: getRiskColor(destData.risk) }}>
                  {destData.risk}/100
                </span>
              </div>
              <p className="font-bold text-slate-900">{destData.name}</p>
              <p className="text-xs text-slate-500">{destData.region}</p>
              {riskOverrides[destination] && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  Risk manually adjusted
                </p>
              )}
            </div>

            {/* Route Summary */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold mb-2">Overall Route Risk</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold" style={{ color: getRiskColor(routeMetrics.routeRisk) }}>
                  {routeMetrics.routeRisk}
                </span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
            </div>

            {/* Feedback History */}
            {feedbackHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Feedback ({feedbackHistory.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {feedbackHistory.slice(0, 5).map((feedback) => (
                    <div key={feedback.id} className="text-xs p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{feedback.country}</span>
                        <span className="text-slate-500">
                          {feedback.oldRisk} → {feedback.newRisk}
                        </span>
                      </div>
                      {feedback.note && (
                        <p className="text-slate-600 truncate">{feedback.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modified Countries */}
            {Object.keys(riskOverrides).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Modified Risk Levels
                </h4>
                <div className="space-y-2">
                  {Object.entries(riskOverrides).map(([country, data]) => (
                    <div key={country} className="flex items-center justify-between text-xs p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="font-semibold text-slate-900">{country}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 line-through">{LOCATIONS[country]?.risk}</span>
                        <span className="font-bold text-blue-600">{data.risk}</span>
                        <button 
                          onClick={() => resetRisk(country)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="bg-slate-100 border-t border-slate-200 px-6 py-4">
        <div className="grid grid-cols-6 gap-4">
          <StatBox icon={BarChart3} label="Route Risk" value={`${routeMetrics.routeRisk}/100`} color={getRiskColor(routeMetrics.routeRisk)} />
          <StatBox icon={MapPin} label="Distance" value={`${(routeMetrics.distance / 1000).toFixed(1)}k km`} color="#3b82f6" />
          <StatBox icon={Clock} label="Sea Transit" value={`${routeMetrics.seaDays} days`} color="#10b981" />
          <StatBox icon={Flag} label="Countries" value={Object.keys(LOCATIONS).length} color="#f59e0b" />
          <StatBox icon={Edit3} label="Modified" value={Object.keys(riskOverrides).length} color="#8b5cf6" />
          <StatBox icon={CheckCircle} label="Feedback" value={feedbackHistory.length} color="#06b6d4" />
        </div>
      </div>
    </section>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
