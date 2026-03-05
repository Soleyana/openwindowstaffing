import axios from "axios";
import { API_BASE } from "./config";
import { REDIRECT_KEY } from "../lib/authRedirect";
import { isAuthInitialized } from "../lib/authState";

/**
 * baseURL from VITE_API_URL (production) or "/api" (local dev proxy).
 * withCredentials: true enables cookie-based auth (httpOnly cookies).
 */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const MUTATING_METHODS = ["post", "put", "patch", "delete"];
let csrfTokenPromise = null;

/**
 * Fetches CSRF token from /api/security/csrf (sets cookie + returns token).
 * Required before any POST/PUT/PATCH/DELETE. Resets cache on failure so mobile can retry.
 */
async function ensureCsrfToken() {
  if (csrfTokenPromise) {
    try {
      const token = await csrfTokenPromise;
      if (token) return token;
    } catch {
      csrfTokenPromise = null;
    }
  }
  const p = api
    .get("/security/csrf", { withCredentials: true })
    .then((r) => r.data?.token || "")
    .catch((err) => {
      csrfTokenPromise = null;
      throw err;
    });
  csrfTokenPromise = p;
  return p;
}

/**
 * Preload CSRF token (call on login/signup mount so token is ready before first submit).
 */
export function preloadCsrfToken() {
  ensureCsrfToken().catch(() => {});
}

/* FormData: do NOT set Content-Type - browser adds multipart boundary. CSRF token for mutating requests. */
api.interceptors.request.use(async (config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  if (MUTATING_METHODS.includes(config.method?.toLowerCase?.())) {
    const token = await ensureCsrfToken();
    if (token) config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

/* 401: redirect to login with message. Skip for auth/me. Only redirect when auth has finished initializing. */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined") {
      if (err.response?.status === 401) {
        const url = err.config?.url || "";
        if (url.includes("auth/me")) return Promise.reject(err);
        if (!isAuthInitialized()) return Promise.reject(err);
        const currentPath = window.location.pathname || "";
        const skipRedirectPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/invite"];
        if (!skipRedirectPaths.some((p) => currentPath.startsWith(p))) {
          try {
            sessionStorage.setItem(REDIRECT_KEY, currentPath + (window.location.search || ""));
          } catch {
            /* ignore */
          }
          window.sessionStorage.setItem("auth_expired_message", "Session expired. Please sign in again.");
          window.location.replace("/login");
          return Promise.reject(err);
        }
      } else {
        /* Global error toast for network/server failures */
        const isNetworkError = !err.response;
        const isServerError = err.response?.status >= 500;
        if (isNetworkError || isServerError) {
          const message = isNetworkError
            ? "Network error. Please check your connection and try again."
            : (err.response?.data?.message || "Server error. Please try again later.");
          window.dispatchEvent(new CustomEvent("api-error", { detail: { message } }));
        }
      }
      if (import.meta.env.DEV && err.config) {
        const reqId = err.response?.data?.requestId || err.request?.requestId;
        if (reqId) console.debug("[API Error] requestId:", reqId, err.config?.url, err.response?.status);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
