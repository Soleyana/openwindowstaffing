import { useState, useEffect } from "react";
import api from "../api/axios";

/**
 * Status page: pings /api/health to verify API connectivity.
 * Useful for debugging "Network Error" in production.
 */
export default function Status() {
  const [status, setStatus] = useState({ loading: true, ok: false, data: null, error: null });

  useEffect(() => {
    const base = api.defaults.baseURL || "/api";
    const healthUrl = base.replace(/\/$/, "") + "/health";

    fetch(healthUrl, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setStatus({ loading: false, ok: data.status === "ok", data }))
      .catch((err) =>
        setStatus({
          loading: false,
          ok: false,
          data: null,
          error: err.message || "Network Error",
        })
      );
  }, []);

  if (status.loading) {
    return (
      <div className="status-page">
        <h1>API Status</h1>
        <p>Checking...</p>
      </div>
    );
  }

  return (
    <div className="status-page">
      <h1>API Status</h1>
      <div className={`status-badge ${status.ok ? "ok" : "error"}`}>
        {status.ok ? "Connected" : "Error"}
      </div>
      {status.data && (
        <pre>{JSON.stringify(status.data, null, 2)}</pre>
      )}
      {status.error && <p className="error-msg">Error: {status.error}</p>}
      <p className="hint">
        If you see &quot;Network Error&quot;, check: CORS_ORIGINS, VITE_API_URL, CLIENT_URL, and cookie
        settings (sameSite/secure).
      </p>
    </div>
  );
}
