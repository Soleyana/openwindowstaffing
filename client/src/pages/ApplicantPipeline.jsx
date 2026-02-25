import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getRecruiterApplications,
  updateRecruiterApplicationStatus,
  addRecruiterNote,
} from "../api/recruiterApplications";
import {
  PIPELINE_STATUSES,
  PIPELINE_COLUMN_LABELS,
} from "../constants/applicationStatuses";
import { API_BASE_URL } from "../config";

function ApplicantCard({ app, onStatusChange, onSelect }) {
  const [open, setOpen] = useState(false);
  const applicantName = [app.firstName, app.lastName].filter(Boolean).join(" ") || app.email || "—";

  return (
    <div className="pipeline-card" onClick={() => onSelect(app)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(app)}>
      <div className="pipeline-card-header">
        <strong className="pipeline-card-name">{applicantName}</strong>
        <div className="pipeline-card-actions">
          <button
            type="button"
            className="pipeline-card-dropdown-btn"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            aria-label="Change status"
            aria-expanded={open}
          >
            ⋮
          </button>
          {open && (
            <>
              <div className="pipeline-card-dropdown-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-hidden="true" />
              <div className="pipeline-card-dropdown" onClick={(e) => e.stopPropagation()}>
                {PIPELINE_STATUSES.filter((s) => s !== app.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onStatusChange(app._id, status);
                      setOpen(false);
                    }}
                  >
                    {PIPELINE_COLUMN_LABELS[status]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="pipeline-card-job">{app.jobTitle || app.job?.title || "—"}</div>
      <div className="pipeline-card-date">
        Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
      </div>
    </div>
  );
}

function ApplicantDrawer({ app, onClose, onStatusChange, onNoteAdded }) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!app) return null;

  const applicantName = [app.firstName, app.lastName].filter(Boolean).join(" ") || app.email || "—";

  const handleAddNote = async (e) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await addRecruiterNote(app._id, text);
      onNoteAdded(app._id, text);
      setNoteText("");
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to add note", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="pipeline-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="pipeline-drawer" role="dialog" aria-label="Applicant details">
        <div className="pipeline-drawer-header">
          <h2 className="pipeline-drawer-title">{applicantName}</h2>
          <button type="button" className="pipeline-drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="pipeline-drawer-body">
          <section className="pipeline-drawer-section">
            <h3>Contact</h3>
            <p><strong>Email:</strong> {app.email || "—"}</p>
            <p><strong>Phone:</strong> {app.phone || "—"}</p>
          </section>
          <section className="pipeline-drawer-section">
            <h3>Job</h3>
            <p>{app.jobTitle || app.job?.title || "—"}</p>
            {app.job?.company && <p className="pipeline-drawer-meta">{app.job.company} • {app.job?.location}</p>}
          </section>
          {app.resumeUrl && (
            <section className="pipeline-drawer-section">
              <h3>Resume</h3>
              <a
                href={`${API_BASE_URL}/uploads/${app.resumeUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                Download resume
              </a>
            </section>
          )}
          {app.message && (
            <section className="pipeline-drawer-section">
              <h3>Message</h3>
              <p>{app.message}</p>
            </section>
          )}
          <section className="pipeline-drawer-section">
            <h3>Recruiter Notes</h3>
            {app.recruiterNotes?.length > 0 ? (
              <ul className="pipeline-notes-list">
                {app.recruiterNotes.map((n, i) => (
                  <li key={i} className="pipeline-note">
                    <p className="pipeline-note-text">{n.text}</p>
                    <span className="pipeline-note-meta">
                      {n.createdBy?.name || "Unknown"} • {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pipeline-notes-empty">No notes yet.</p>
            )}
            <form onSubmit={handleAddNote} className="pipeline-add-note-form">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add internal note…"
                rows={3}
                className="pipeline-note-input"
              />
              <button type="submit" disabled={submitting || !noteText.trim()} className="pipeline-note-submit">
                {submitting ? "Adding…" : "Add note"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

export default function ApplicantPipeline() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ byStatus: {}, applications: [] });
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await getRecruiterApplications();
      setData(res.data || { byStatus: {}, applications: [] });
    } catch {
      setData({ byStatus: {}, applications: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleStatusChange = async (appId, newStatus) => {
    const prev = JSON.parse(JSON.stringify(data));
    setData((d) => {
      const next = { ...d, byStatus: { ...d.byStatus } };
      const app = d.applications?.find((a) => a._id === appId) || Object.values(d.byStatus || {}).flat().find((a) => a._id === appId);
      if (!app) return d;
      const oldStatus = app.status;
      if (next.byStatus[oldStatus]) {
        next.byStatus[oldStatus] = next.byStatus[oldStatus].filter((a) => a._id !== appId);
      }
      if (!next.byStatus[newStatus]) next.byStatus[newStatus] = [];
      next.byStatus[newStatus] = [{ ...app, status: newStatus, lastUpdatedAt: new Date(), lastUpdatedBy: user }, ...(next.byStatus[newStatus] || [])];
      return next;
    });
    try {
      await updateRecruiterApplicationStatus(appId, newStatus);
    } catch (err) {
      setData(prev);
      toast.show(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleNoteAdded = (appId, text) => {
    const note = { text, createdBy: user, createdAt: new Date() };
    setData((d) => {
      const app = d.applications?.find((a) => a._id === appId) || Object.values(d.byStatus || {}).flat().find((a) => a._id === appId);
      if (!app) return d;
      const updated = { ...app, recruiterNotes: [...(app.recruiterNotes || []), note] };
      const next = { ...d, byStatus: { ...d.byStatus } };
      next.applications = (d.applications || []).map((a) => (a._id === appId ? updated : a));
      Object.keys(next.byStatus || {}).forEach((status) => {
        next.byStatus[status] = (next.byStatus[status] || []).map((a) => (a._id === appId ? updated : a));
      });
      return next;
    });
    if (selectedApp?._id === appId) {
      setSelectedApp((s) => ({ ...s, recruiterNotes: [...(s.recruiterNotes || []), note] }));
    }
  };

  if (loading) {
    return (
      <div className="pipeline-page">
        <h1 className="pipeline-title">Applicant Pipeline</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="pipeline-page">
      <h1 className="pipeline-title">Applicant Pipeline</h1>
      <p className="pipeline-subtitle">Manage applicants across jobs. Drag cards or use the menu to move between stages.</p>

      <div className="pipeline-board">
        {PIPELINE_STATUSES.map((status) => (
          <div key={status} className="pipeline-column">
            <h3 className="pipeline-column-title">{PIPELINE_COLUMN_LABELS[status]}</h3>
            <div className="pipeline-column-cards">
              {(data.byStatus?.[status] || []).map((app) => (
                <ApplicantCard
                  key={app._id}
                  app={app}
                  onStatusChange={handleStatusChange}
                  onSelect={setSelectedApp}
                />
              ))}
              {(data.byStatus?.[status] || []).length === 0 && (
                <div className="pipeline-column-empty">No applicants</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedApp && (
        <ApplicantDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
          onNoteAdded={handleNoteAdded}
        />
      )}
    </div>
  );
}
