/**
 * Single source of truth for API base URL.
 * Development: "/api" (Vite proxy).
 * Production same-origin: "/api" (backend serves the app).
 * Production cross-origin: VITE_API_URL (frontend/backend on different origins).
 */
const isDev = import.meta.env.DEV;

const raw =
  (typeof window !== "undefined" && window.__VITE_API_URL__) ||
  import.meta.env.VITE_API_URL;

const API_BASE = isDev
  ? "/api"
  : raw && String(raw).trim()
    ? String(raw).trim().replace(/\/+$/, "") || "/api"
    : "/api";

export { API_BASE };
export const API_BASE_URL = API_BASE;
export default API_BASE;
