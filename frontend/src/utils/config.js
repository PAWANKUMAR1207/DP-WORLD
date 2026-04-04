const isLocalhost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = import.meta.env.VITE_API_URL ||
  (isLocalhost ? "" : "https://dp-world-backend1.onrender.com");

export default API_BASE;
