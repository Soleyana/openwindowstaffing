import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyApplications } from "../api/applications";
import { createOrFindThreadByJobOrApplication } from "../api/messages";
import { ROLES } from "../constants/roles";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";

export default function MyApplications() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [messagingId, setMessagingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== ROLES.APPLICANT) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getMyApplications();
        if (!cancelled) setApplications(data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.role]);

  if (!isLoggedIn) {
    return (
      <div className="jobs-page">
        <p>Please <Link to="/login">sign in</Link> as a candidate to view your applications.</p>
      </div>
    );
  }

  if (user?.role !== ROLES.APPLICANT) {
    return (
      <div className="jobs-page">
        <p>This page is for job seekers. <Link to="/post-job">Post a job</Link> as a recruiter.</p>
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
        <span> / </span>
        <Link to="/jobs">Jobs</Link>
      </nav>
      <h1 className="jobs-title">My Applications</h1>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && applications.length === 0 && (
        <p className="jobs-empty">You haven&apos;t applied to any jobs yet. <Link to="/jobs">Browse jobs</Link></p>
      )}
      {!loading && !error && applications.length > 0 && (
        <div className="applications-list">
          {applications.map((app) => (
            <div key={app._id} className="application-card">
              <div className="application-card-main">
                <div className="application-card-header-row">
                  {app.job?._id ? (
                    <Link to={`/jobs/${app.job._id}`} className="application-card-title">
                      {app.job?.title}
                    </Link>
                  ) : (
                    <span className="application-card-title application-card-title--unavailable">
                      Job no longer available
                    </span>
                  )}
                  <StatusBadge status={app.status} />
                </div>
                <p className="application-card-meta">
                  {app.job ? (
                    <>{app.job.company} • {app.job.location} • {app.job.jobType}</>
                  ) : (
                    <em>This position has been removed</em>
                  )}
                </p>
              </div>
              <div className="application-card-actions">
                <p className="application-card-date">
                  Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
                </p>
                {app._id && (
                  <button
                    type="button"
                    className="application-card-message-btn"
                    disabled={messagingId === app._id}
                    onClick={async () => {
                      setMessagingId(app._id);
                      try {
                        const threadId = await createOrFindThreadByJobOrApplication({ applicationId: app._id });
                        if (threadId) navigate(`/inbox?thread=${threadId}`);
                        else toast.show("Could not start conversation", "error");
                      } catch (err) {
                        toast.show(err.response?.data?.message || err.message || "Could not start message", "error");
                      } finally {
                        setMessagingId(null);
                      }
                    }}
                  >
                    {messagingId === app._id ? "Opening…" : "Message Recruiter"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
