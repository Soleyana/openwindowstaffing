import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyApplications } from "../api/applications";

export default function MyApplications() {
  const { isLoggedIn, user, token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== "candidate" || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getMyApplications(token);
        if (!cancelled) setApplications(data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.role, token]);

  if (!isLoggedIn) {
    return (
      <div className="jobs-page">
        <p>Please <Link to="/login">sign in</Link> as a candidate to view your applications.</p>
      </div>
    );
  }

  if (user?.role !== "candidate") {
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
                <Link to={`/jobs/${app.job?._id}`} className="application-card-title">
                  {app.job?.title}
                </Link>
                <p className="application-card-meta">
                  {app.job?.company} • {app.job?.location} • {app.job?.jobType}
                </p>
                <span className={`application-card-status application-card-status--${app.status}`}>
                  {app.status}
                </span>
              </div>
              <p className="application-card-date">
                Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
