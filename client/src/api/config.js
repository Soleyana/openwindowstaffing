/**
 * Single source of truth for API base URL.
 * Production: MUST use VITE_API_URL. Rejects missing or frontend-origin (prevents silent failures).
 * Development: "/api" (Vite proxy).
 */
const isDev = import.meta.env.DEV;

const raw =
  (typeof window !== "undefined" && window.__VITE_API_URL__) ||
  import.meta.env.VITE_API_URL;

let API_BASE;

if (isDev) {
  API_BASE = "/api";
} else if (raw && String(raw).trim()) {
  const base = String(raw).trim().replace(/\/+$/, "") || "";
  let isOwnOrigin = false;
  if (typeof window !== "undefined") {
    try {
      isOwnOrigin = new URL(base).origin === window.location.origin;
    } catch {
      isOwnOrigin = base === window.location.origin;
    }
  }
  if (isOwnOrigin) {
    console.error(
      "[API] VITE_API_URL must point to the backend, not the frontend. Current value points to this site's origin. Set VITE_API_URL to your backend URL (e.g. https://your-backend.onrender.com/api) in Render Environment and redeploy."
    );
    API_BASE = "https://__api_config_invalid__.invalid";
  } else {
    API_BASE = base;
  }
} else {
  if (typeof console !== "undefined") {
    console.error(
      "[API] VITE_API_URL is required in production. Set it in Render (client service) Environment to your backend URL (e.g. https://your-backend.onrender.com/api) and redeploy. API requests are blocked to prevent silent failures."
    );
  }
  API_BASE = "https://__api_config_invalid__.invalid";
}

export { API_BASE };
export default API_BASE;
