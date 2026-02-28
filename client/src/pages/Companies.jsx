import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../api/jobs";
import { BRAND } from "../config";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const json = await getJobs();
        if (cancelled) return;
        if (json?.success && json.data) {
          const byCompany = {};
          for (const job of json.data) {
            const name = (job.company || BRAND.companyName || "Healthcare Employer").trim();
            if (!byCompany[name]) byCompany[name] = { name, count: 0 };
            byCompany[name].count++;
          }
          setCompanies(Object.values(byCompany).sort((a, b) => b.count - a.count));
        } else {
          setCompanies([]);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load companies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="jobs-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
      </nav>
      <h1 className="jobs-title">Healthcare Employers</h1>
      <p className="jobs-subtitle">Browse jobs by company</p>

      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}

      {!loading && !error && companies.length === 0 && (
        <p className="jobs-empty">No companies with active listings yet.</p>
      )}

      {!loading && !error && companies.length > 0 && (
        <div className="companies-list" style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
          {companies.map((c) => (
            <Link
              key={c.name}
              to={`/jobs?company=${encodeURIComponent(c.name)}`}
              className="company-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{c.name}</span>
              <span style={{ color: "#64748b", fontSize: "0.95rem" }}>{c.count} job{c.count !== 1 ? "s" : ""}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
