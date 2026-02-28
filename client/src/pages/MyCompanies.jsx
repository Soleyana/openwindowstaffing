import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyJobs } from "../api/jobs";
import { BRAND } from "../config";

export default function MyCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyJobs()
      .then((res) => {
        if (cancelled) return;
        const jobs = res.data || [];
        const byCompany = {};
        for (const job of jobs) {
          const name = (job.company || BRAND.companyName || "Healthcare Employer").trim();
          if (!byCompany[name]) byCompany[name] = { name, count: 0, jobs: [] };
          byCompany[name].count++;
          byCompany[name].jobs.push(job);
        }
        setCompanies(Object.values(byCompany).sort((a, b) => b.count - a.count));
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">My Companies</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1.5rem", color: "#64748b" }}>
        Companies associated with your job listings
      </p>

      {loading && <p className="dashboard-placeholder">Loading…</p>}
      {!loading && companies.length === 0 && (
        <p className="dashboard-placeholder">
          You haven&apos;t posted any jobs yet. <Link to="/post-job">Post your first job</Link> to see companies here.
        </p>
      )}
      {!loading && companies.length > 0 && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {companies.map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{c.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ color: "#64748b" }}>{c.count} job{c.count !== 1 ? "s" : ""}</span>
                <Link to={`/jobs?company=${encodeURIComponent(c.name)}`} style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem" }}>
                  View jobs
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
