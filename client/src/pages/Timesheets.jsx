import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyAssignments } from "../api/assignments";
import { getMyTimesheets, createTimesheet, updateTimesheet, submitTimesheet } from "../api/timesheets";
import { useToast } from "../context/ToastContext";
import { ROLES } from "../constants/roles";

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { periodStart: monday.toISOString().split("T")[0], periodEnd: sunday.toISOString().split("T")[0] };
}

function weekDays(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = [];
  const curr = new Date(start);
  while (curr <= end) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

export default function Timesheets() {
  const { user } = useAuth();
  const { show: showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== ROLES.APPLICANT) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [assignRes, tsRes] = await Promise.all([getMyAssignments(), getMyTimesheets()]);
        if (!cancelled) {
          setAssignments(assignRes.data || []);
          setTimesheets(tsRes.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const activeAssignments = assignments.filter((a) => ["accepted", "active"].includes(a.status));

  const handleCreate = async (assignmentId, periodStart, periodEnd, entries) => {
    if (!assignmentId || !periodStart || !periodEnd) return;
    setSubmitting(true);
    try {
      await createTimesheet({ assignmentId, periodStart, periodEnd, entries });
      showToast("Timesheet created", "success");
      setCreateModal(null);
      const res = await getMyTimesheets();
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id, entries) => {
    setSubmitting(true);
    try {
      await updateTimesheet(id, { entries });
      showToast("Timesheet updated", "success");
      setEditModal(null);
      const res = await getMyTimesheets();
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (id) => {
    setSubmitting(true);
    try {
      await submitTimesheet(id);
      showToast("Timesheet submitted", "success");
      const res = await getMyTimesheets();
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevertToDraft = async (id) => {
    setSubmitting(true);
    try {
      await updateTimesheet(id, { revertToDraft: true });
      showToast("Reverted to draft. You can edit and resubmit.", "success");
      const res = await getMyTimesheets();
      setTimesheets(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to revert", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== ROLES.APPLICANT) {
    return (
      <div className="dashboard-page">
        <p>This page is for job seekers. <Link to="/login">Sign in</Link> as a candidate.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1>My Timesheets</h1>
        {activeAssignments.length > 0 && (
          <button type="button" className="btn-primary" onClick={() => setCreateModal({})}>
            New Timesheet
          </button>
        )}
      </div>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && activeAssignments.length === 0 && timesheets.length === 0 && (
        <p className="text-muted">You need an active assignment to log time. Complete an assignment and accept an offer first.</p>
      )}
      {!loading && !error && (timesheets.length > 0 || createModal) && (
        <div className="card">
          {timesheets.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {timesheets.map((ts) => (
                <li key={ts._id} style={{ padding: "1rem 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <strong>
                      {ts.periodStart && ts.periodEnd
                        ? `${new Date(ts.periodStart).toLocaleDateString()} – ${new Date(ts.periodEnd).toLocaleDateString()}`
                        : "Timesheet"}
                    </strong>
                    <span className="badge" style={{ textTransform: "capitalize" }}>
                      {STATUS_LABELS[ts.status] || ts.status}
                    </span>
                    {ts.jobId?.title && <span className="text-muted">{ts.jobId.title}</span>}
                    {(ts.totalHours != null || (ts.entries && ts.entries.length)) && (
                      <span>{((ts.totalHours ?? (ts.entries || []).reduce((s, e) => s + (e.hours || 0), 0))).toFixed(1)} hrs</span>
                    )}
                  </div>
                  {ts.rejectionReason && (
                    <p style={{ margin: "0.25rem 0 0", color: "var(--danger)", fontSize: "0.9rem" }}>
                      Rejected: {ts.rejectionReason}
                    </p>
                  )}
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {ts.status === "draft" && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setEditModal({ ts, entries: ts.entries || [] })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={submitting}
                          onClick={() => handleSubmit(ts._id)}
                        >
                          {submitting ? "Submitting…" : "Submit"}
                        </button>
                      </>
                    )}
                    {ts.status === "rejected" && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={submitting}
                        onClick={() => handleRevertToDraft(ts._id)}
                      >
                        Revert to Draft
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {createModal && (
        <CreateTimesheetModal
          assignments={activeAssignments}
          timesheets={timesheets}
          onClose={() => setCreateModal(null)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}
      {editModal && (
        <EditTimesheetModal
          ts={editModal.ts}
          entries={editModal.entries}
          onClose={() => setEditModal(null)}
          onSubmit={(entries) => handleUpdate(editModal.ts._id, entries)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function CreateTimesheetModal({ assignments, timesheets, onClose, onSubmit, submitting }) {
  const [assignmentId, setAssignmentId] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState([]);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7 * weekOffset);
  const { periodStart, periodEnd } = getWeekRange(baseDate);
  const days = weekDays(periodStart, periodEnd);

  const existing = timesheets.find(
    (t) => {
      const tAssignId = t.assignmentId?._id?.toString?.() ?? t.assignmentId?.toString?.();
      if (tAssignId !== assignmentId) return false;
      if (!t.periodStart) return false;
      return new Date(t.periodStart).toDateString() === new Date(periodStart).toDateString();
    }
  );

  useEffect(() => {
    const ds = weekDays(periodStart, periodEnd);
    setEntries(ds.map((d) => ({ date: d.toISOString().split("T")[0], hours: 0, notes: "" })));
  }, [periodStart, periodEnd]);

  const handleChange = (idx, field, val) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "hours" ? parseFloat(val) || 0 : val };
      return next;
    });
  };

  const handleCreate = () => {
    if (!assignmentId) return;
    if (existing) {
      return;
    }
    onSubmit(assignmentId, periodStart, periodEnd, entries.filter((e) => e.hours > 0).map((e) => ({ date: e.date, hours: e.hours, notes: e.notes || undefined })));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "28rem" }}>
        <div className="modal-header">
          <h2>New Timesheet</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <label>
            Assignment
            <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
              <option value="">Select assignment</option>
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>{a.jobId?.title || "Assignment"}</option>
              ))}
            </select>
          </label>
          <label>
            Week
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button type="button" className="btn-secondary" onClick={() => setWeekOffset((o) => o - 1)}>Previous</button>
              <span>{new Date(periodStart).toLocaleDateString()} – {new Date(periodEnd).toLocaleDateString()}</span>
              <button type="button" className="btn-secondary" onClick={() => setWeekOffset((o) => o + 1)}>Next</button>
            </div>
          </label>
          {existing && <p className="text-muted" style={{ fontSize: "0.9rem" }}>A timesheet already exists for this assignment and week.</p>}
          <div style={{ marginTop: "1rem" }}>
            <strong>Hours by day</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.5rem", marginTop: "0.5rem" }}>
              {days.map((d, i) => (
                <div key={d.toISOString()} style={{ display: "contents" }}>
                  <span style={{ fontSize: "0.9rem" }}>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={entries[i]?.hours ?? 0}
                    onChange={(e) => handleChange(i, "hours", e.target.value)}
                    style={{ width: "4rem" }}
                  />
                </div>
              ))}
            </div>
            <p className="text-muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              Total: {entries.reduce((s, e) => s + (e.hours || 0), 0).toFixed(1)} hrs
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!assignmentId || existing || submitting}
            onClick={handleCreate}
          >
            {submitting ? "Creating…" : "Create Timesheet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTimesheetModal({ ts, entries: initialEntries, onClose, onSubmit, submitting }) {
  const [entries, setEntries] = useState(initialEntries || []);

  const days = entries.map((e) => (e.date ? new Date(e.date) : null)).filter(Boolean);
  const handleChange = (idx, field, val) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "hours" ? parseFloat(val) || 0 : val };
      return next;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "28rem" }}>
        <div className="modal-header">
          <h2>Edit Timesheet</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            {ts.periodStart && ts.periodEnd
              ? `${new Date(ts.periodStart).toLocaleDateString()} – ${new Date(ts.periodEnd).toLocaleDateString()}`
              : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", marginTop: "0.5rem" }}>
            {entries.map((e, i) => (
              <div key={e.date || i} style={{ display: "contents" }}>
                <span style={{ fontSize: "0.9rem" }}>
                  {e.date ? new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—"}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={e.hours ?? 0}
                  onChange={(ev) => handleChange(i, "hours", ev.target.value)}
                  style={{ width: "4rem" }}
                />
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Total: {entries.reduce((s, e) => s + (e.hours || 0), 0).toFixed(1)} hrs
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={() => onSubmit(entries)}>
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
