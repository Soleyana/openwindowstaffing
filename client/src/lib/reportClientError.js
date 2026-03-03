/**
 * Report client-side errors. In dev: log to console. In prod: POST to /api/client-errors (rate limited).
 * Must not collect sensitive data (no PII, tokens, etc.).
 */

import { API_BASE } from "../api/config";

export function reportClientError(error, errorInfo = {}) {
  const route = typeof window !== "undefined" ? window.location?.pathname || "" : "";
  const message = error?.message || "Unknown error";
  const stackSnippet = error?.stack ? String(error.stack).slice(0, 1000) : undefined;

  if (import.meta.env.DEV) {
    console.error("[Client Error]", { route, message, stackSnippet, errorInfo });
    return;
  }

  try {
    fetch(`${API_BASE}/client-errors`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, message, stackSnippet }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
