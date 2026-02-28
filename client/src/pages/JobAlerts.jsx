import { useState } from "react";
import { Link } from "react-router-dom";
import { submitContact } from "../api/contact";
import { BRAND } from "../config";

export default function JobAlerts() {
  const [email, setEmail] = useState("");
  const [keywords, setKeywords] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      await submitContact({
        name: "Job Alert Signup",
        email: email.trim(),
        message: `Job Alert signup. Keywords: ${keywords.trim() || "All"}`,
      });
      setStatus("success");
      setEmail("");
      setKeywords("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="jobs-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
      </nav>
      <h1 className="jobs-title">Job Alerts</h1>
      <p className="jobs-subtitle">Get notified when new jobs match your preferences.</p>

      <div
        className="job-alerts-card"
        style={{
          maxWidth: "500px",
          marginTop: "1.5rem",
          padding: "2rem",
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {status === "success" ? (
          <div style={{ padding: "1rem", background: "#ecfdf5", borderRadius: "8px", color: "#065f46" }}>
            <strong>Thanks!</strong> We&apos;ll notify you when matching jobs are posted.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label htmlFor="alert-email" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                Email *
              </label>
              <input
                id="alert-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
            </div>
            <div>
              <label htmlFor="alert-keywords" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                Keywords (optional)
              </label>
              <input
                id="alert-keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. RN, Therapy, Travel"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "1rem",
                }}
              />
            </div>
            {status === "error" && (
              <p style={{ color: "#dc2626", margin: 0 }}>Something went wrong. Please try again or contact {BRAND.contactEmail}.</p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: "0.75rem 1.5rem",
                background: "var(--cta-orange)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: status === "loading" ? "wait" : "pointer",
              }}
            >
              {status === "loading" ? "Subscribing…" : "Subscribe to Alerts"}
            </button>
          </form>
        )}
      </div>

      <p style={{ marginTop: "1.5rem", color: "#64748b" }}>
        <Link to="/jobs">Browse current openings</Link>
      </p>
    </div>
  );
}
