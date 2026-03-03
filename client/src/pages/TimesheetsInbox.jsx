import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { getTimesheets, approveTimesheet, rejectTimesheet } from "../api/timesheets";
import { useToast } from "../context/ToastContext";
import { isStaff } from "../constants/roles";

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function TimesheetsInbox() {
  const { user } = useAuth();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { show: showToast } = useToast();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "submitted" });
  const [actionModal, setActionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !isStaff(user.role)) {
      setLoading(false);
      return;
    }
    if (companies?.length === 1 && !selectedCompanyId) {
      setSelectedCompanyId?.(companies[0]._id);
    }
  }, [user, companies, selectedCompanyId]);

  useEffect(() => {
    if (!user || !isStaff(user.role)) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = { ...filters };
        if (selectedCompanyId) params.companyId = selectedCompanyId;
        const res = await getTimesheets(params);
        if (!cancelled) setTimesheets(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, selectedCompanyId, filters.status, filters.from, filters.to]);

  const handleApprove = async (id) => {
    setSubmitting(true);
    try {
      await approveTimesheet(id);
      showToast("Timesheet approved", "success");
      setActionModal(null);
      const params = { ...filters };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await getTimesheets(params);
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      showToast("Rejection reason is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await rejectTimesheet(id, rejectReason.trim());
      showToast("Timesheet rejected", "success");
      setActionModal(null);
      setRejectReason("");
      const params = { ...filters };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await getTimesheets(params);
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isStaff(user.role)) {
    return (
      <div className="dashboard-page">
        <p>This page is for recruiters and company owners.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
        <h1>Timesheets Inbox</h1>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {companies?.length > 1 ? (
          <label>
            Company
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => setSelectedCompanyId?.(e.target.value || null)}
              style={{ marginLeft: "0.5rem" }}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Status
          <select
            value={filters.status || ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && (
        <div className="card">
          {timesheets.length === 0 ? (
            <p className="text-muted">No timesheets match your filters.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Period</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Candidate</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Job</th>
                    <th style={{ textAlign: "right", padding: "0.5rem" }}>Hours</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((ts) => (
                    <tr key={ts._id}>
                      <td style={{ padding: "0.5rem" }}>
                        {formatDate(ts.periodStart)} – {formatDate(ts.periodEnd)}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {ts.candidateId?.name || ts.candidateId?.email || "—"}
                      </td>
                      <td style={{ padding: "0.5rem" }}>{ts.jobId?.title || "—"}</td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        {(ts.totalHours ?? 0).toFixed(1)}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <span className="badge" style={{ textTransform: "capitalize" }}>
                          {STATUS_LABELS[ts.status] || ts.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {ts.status === "submitted" && (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                              onClick={() => setActionModal({ ts, action: "approve" })}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                              onClick={() => setActionModal({ ts, action: "reject" })}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "24rem" }}>
            <div className="modal-header">
              <h2>{actionModal.action === "approve" ? "Approve Timesheet" : "Reject Timesheet"}</h2>
              <button type="button" className="modal-close" onClick={() => setActionModal(null)} aria-label="Close">&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                {actionModal.ts.candidateId?.name || actionModal.ts.candidateId?.email} — {formatDate(actionModal.ts.periodStart)} – {formatDate(actionModal.ts.periodEnd)} ({(actionModal.ts.totalHours ?? 0).toFixed(1)} hrs)
              </p>
              {actionModal.action === "reject" && (
                <label style={{ display: "block", marginTop: "1rem" }}>
                  Rejection reason (required)
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this timesheet is being rejected…"
                    rows={3}
                    style={{ width: "100%", marginTop: "0.25rem" }}
                  />
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              {actionModal.action === "approve" ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={submitting}
                  onClick={() => handleApprove(actionModal.ts._id)}
                >
                  {submitting ? "Approving…" : "Approve"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={submitting || !rejectReason.trim()}
                  style={{ background: "var(--danger, #dc2626)" }}
                  onClick={() => handleReject(actionModal.ts._id)}
                >
                  {submitting ? "Rejecting…" : "Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
