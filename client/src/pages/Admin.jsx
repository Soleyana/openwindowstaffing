import { useState, useEffect } from "react";
import { getAdminCompanies, getAdminSystem } from "../api/admin";

export default function Admin() {
  const [companies, setCompanies] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [compRes, sysRes] = await Promise.all([getAdminCompanies(), getAdminSystem()]);
        if (!cancelled) {
          setCompanies(compRes.data || []);
          setSystem(sysRes.data || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton-block" style={{ height: 200 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">Admin</h1>
          <p className="dashboard-subtitle" style={{ color: "#dc2626" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">Admin</h1>
        <p className="dashboard-subtitle">Platform administration</p>
      </div>

      {system && (
        <div className="dashboard-hero" style={{ marginBottom: "1.5rem" }}>
          <h2 className="dashboard-subtitle" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>System</h2>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <span><strong>Status:</strong> {system.status}</span>
            <span><strong>DB:</strong> {system.db}</span>
            <span><strong>Version:</strong> {system.version}</span>
            <span><strong>Time:</strong> {system.timestamp}</span>
          </div>
        </div>
      )}

      <div className="dashboard-hero">
        <h2 className="dashboard-subtitle" style={{ fontSize: "1rem", marginBottom: "1rem" }}>All Companies</h2>
        {companies.length === 0 ? (
          <p style={{ color: "#64748b" }}>No companies yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="recruiter-applications-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Legal Name</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.legalName || "—"}</td>
                    <td>{c.status}</td>
                    <td>{c.ownerId?.name || c.ownerId?.email || "—"}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
