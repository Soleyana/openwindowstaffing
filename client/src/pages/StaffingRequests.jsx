import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";
import { listStaffingRequests, createStaffingRequest, updateStaffingRequest } from "../api/staffingRequests";
import { getMyCompanies } from "../api/companies";
import { useToast } from "../context/ToastContext";

const STATUS_OPTIONS = ["open", "in_progress", "filled", "closed"];

export default function StaffingRequests() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    companyId: "",
    title: "",
    description: "",
    role: "",
    shift: "",
    startDate: "",
    payRange: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user || !isStaff(user.role)) return;
    try {
      setLoading(true);
      const [reqRes, coRes] = await Promise.all([
        listStaffingRequests(),
        getMyCompanies(),
      ]);
      setRequests(reqRes.data || []);
      setCompanies(coRes.data || []);
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.companyId || !form.title?.trim() || submitting) return;
    try {
      setSubmitting(true);
      await createStaffingRequest(form);
      toast.show("Request created");
      setShowForm(false);
      setForm({ companyId: "", title: "", description: "", role: "", shift: "", startDate: "", payRange: "", notes: "" });
      load();
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to create", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStaffingRequest(id, { status });
      setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
      toast.show("Status updated");
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to update", "error");
    }
  };

  if (!user || !isStaff(user.role)) {
    return (
      <div className="staffing-requests-page">
        <p>This page is for recruiters only.</p>
      </div>
    );
  }

  return (
    <div className="staffing-requests-page">
      <div className="staffing-requests-header">
        <h1>Staffing Requests</h1>
        <button
          type="button"
          className="staffing-requests-add-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="staffing-request-form">
          <label>
            Company *
            <select
              value={form.companyId}
              onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
              required
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Title *
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. RN - Med/Surg"
              required
            />
          </label>
          <label>
            Role
            <input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. RN, LPN"
            />
          </label>
          <label>
            Shift
            <input
              value={form.shift}
              onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
              placeholder="e.g. Day, Night"
            />
          </label>
          <label>
            Start Date
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label>
            Pay Range
            <input
              value={form.payRange}
              onChange={(e) => setForm((f) => ({ ...f, payRange: e.target.value }))}
              placeholder="e.g. $40-50/hr"
            />
          </label>
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Additional details"
            />
          </label>
          <div className="staffing-request-form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Request"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : requests.length === 0 ? (
        <p className="staffing-requests-empty">No staffing requests yet. Create one to get started.</p>
      ) : (
        <div className="staffing-requests-list">
          {requests.map((r) => (
            <div key={r._id} className="staffing-request-card">
              <div className="staffing-request-card-body">
                <h3>{r.title}</h3>
                <p className="staffing-request-meta">
                  {r.role && <span>{r.role}</span>}
                  {r.shift && <span>{r.shift}</span>}
                  {r.startDate && <span>Start: {new Date(r.startDate).toLocaleDateString()}</span>}
                  {r.payRange && <span>{r.payRange}</span>}
                </p>
                {r.notes && <p className="staffing-request-notes">{r.notes}</p>}
                <div className="staffing-request-status-row">
                  <span className={`status-badge status-${r.status || "open"}`}>{r.status || "open"}</span>
                  <select
                    value={r.status || "open"}
                    onChange={(e) => handleStatusChange(r._id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
