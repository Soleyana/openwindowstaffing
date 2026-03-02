import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getListingsReport, exportListingsReport } from "../api/reports";
import { getMyCompanies } from "../api/companies";
import { useToast } from "../context/ToastContext";

export default function ListingReports() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    companyId: "",
    status: "",
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyCompanies()
      .then((res) => {
        if (!cancelled) setCompanies(res?.data || res || []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    const q = {
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
      ...(filters.companyId && { companyId: filters.companyId }),
      ...(filters.status && { status: filters.status }),
    };
    getListingsReport(q)
      .then((res) => {
        if (!cancelled) setData(res?.data || res);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.show(err.response?.data?.message || "Failed to load report", "error");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, filters.from, filters.to, filters.companyId, filters.status]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const q = {
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.status && { status: filters.status }),
      };
      await exportListingsReport(q);
      toast.show("Report downloaded");
    } catch (err) {
      toast.show(err.message || "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis || {};
  const rows = data?.rows || [];

  return (
    <div className="dashboard-page listing-reports-page">
      <h1 className="dashboard-title">Listing Reports</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1rem", color: "#64748b" }}>
        Performance overview of your job listings
      </p>

      <div className="listing-reports-filters">
        <label>
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        {companies?.length > 1 && (
          <label>
            <span>Company</span>
            <select
              value={filters.companyId}
              onChange={(e) => setFilters((f) => ({ ...f, companyId: e.target.value }))}
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <button
          type="button"
          className="listing-reports-export-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {loading && <p className="dashboard-placeholder">Loading…</p>}
      {!loading && (
        <>
          <div className="listing-reports-kpis">
            <div className="listing-kpi-card">
              <div className="listing-kpi-label">Total Listings</div>
              <div className="listing-kpi-value">{kpis.totalListings ?? 0}</div>
            </div>
            <div className="listing-kpi-card">
              <div className="listing-kpi-label">Active</div>
              <div className="listing-kpi-value">{kpis.activeListings ?? 0}</div>
            </div>
            <div className="listing-kpi-card">
              <div className="listing-kpi-label">Expired</div>
              <div className="listing-kpi-value">{kpis.expiredListings ?? 0}</div>
            </div>
            <div className="listing-kpi-card">
              <div className="listing-kpi-label">Applications</div>
              <div className="listing-kpi-value">{kpis.totalApplications ?? 0}</div>
            </div>
            <div className="listing-kpi-card">
              <div className="listing-kpi-label">Conversion Rate</div>
              <div className="listing-kpi-value">{kpis.conversionRate ?? "0"}%</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="dashboard-placeholder">
              No job listings match. <Link to="/post-job">Post a job</Link> to see reports.
            </p>
          ) : (
            <div className="listing-reports-table-wrap">
              <table className="listing-reports-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Applications</th>
                    <th>Created</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td>{row.title}</td>
                      <td>{row.company}</td>
                      <td><span className={`status-badge status-${row.status}`}>{row.status}</span></td>
                      <td>{row.applicationsCount}</td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td>
                      <td>{row.createdBy}</td>
                      <td>
                        <Link to="/applicant-pipeline" style={{ color: "var(--primary)", textDecoration: "none" }}>
                          View applicants
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
