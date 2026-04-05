const isLocalhost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = import.meta.env.VITE_API_URL ||
  (isLocalhost ? "" : "https://dp-world-backend1.onrender.com");

// Ping the backend every 10 minutes to prevent Render free tier cold starts
if (!isLocalhost && typeof window !== "undefined") {
  const ping = () => fetch(`${API_BASE}/api/audit-queue`, { method: "GET" }).catch(() => {});
  ping();
  setInterval(ping, 10 * 60 * 1000);
}

export default API_BASE;
