import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";
import { BRAND } from "../config";
import { useToast } from "../context/ToastContext";
import { getMyJobs, deleteJob } from "../api/jobs";
import { getApplicationsForJob, exportApplicationsForJob } from "../api/applications";
import StatusBadge from "../components/StatusBadge";

export default function MyJobs() {
  const { isLoggedIn, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!isLoggedIn || !isStaff(user?.role)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await getMyJobs();
        if (!cancelled) setJobs(data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.role]);

  const handleDelete = async (jobId, jobTitle) => {
    if (!window.confirm(`Delete "${jobTitle}"? This cannot be undone.`)) return;
    try {
      setDeletingId(jobId);
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to delete job", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const loadApplicants = async (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      setApplicants([]);
      return;
    }
    try {
      const data = await getApplicationsForJob(jobId);
      setApplicants(data.data || []);
      setExpandedJob(jobId);
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to load applicants", "error");
    }
  };

  const handleExport = async (jobId) => {
    try {
      setExportingId(jobId);
      await exportApplicationsForJob(jobId);
      toast.show("CSV downloaded");
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to export", "error");
    } finally {
      setExportingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="jobs-page">
        <p>Please <Link to="/login">sign in</Link> as a recruiter to view your jobs.</p>
      </div>
    );
  }

  if (!isStaff(user?.role)) {
    return (
      <div className="jobs-page">
        <p>This page is for employers. <Link to="/my-applications">View your applications</Link> as an applicant.</p>
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
        <span> / </span>
        <Link to="/post-job">Post a job</Link>
      </nav>
      <h1 className="jobs-title">My Jobs</h1>
      <Link to="/post-job" className="my-jobs-add">+ Post new job</Link>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && jobs.length === 0 && (
        <p className="jobs-empty">You haven&apos;t posted any jobs yet. <Link to="/post-job">Post your first job</Link></p>
      )}
      {!loading && !error && jobs.length > 0 && (
        <div className="my-jobs-list">
          {jobs.map((job) => (
            <div key={job._id} className="my-job-card">
              <button
                type="button"
                className="my-job-card-expand-btn"
                onClick={() => loadApplicants(job._id)}
                title={expandedJob === job._id ? "Hide applicants" : "View applicants"}
                aria-label={expandedJob === job._id ? "Hide applicants" : "View applicants"}
              >
                +
              </button>
              <div className="my-job-card-body">
                <div className="my-job-card-header">
                  <Link to={`/jobs/${job._id}`} className="my-job-card-title">{job.title}</Link>
                  <span className="my-job-card-meta">{job.company || BRAND.companyName} • {job.location || "—"} • Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Today"}</span>
                </div>
                <div className="my-job-card-actions">
                  <span className="my-job-card-count">{job.applicationCount || 0} applicant{job.applicationCount !== 1 ? "s" : ""}</span>
                  <button
                    type="button"
                    className="my-job-card-view-btn"
                    onClick={() => loadApplicants(job._id)}
                  >
                    {expandedJob === job._id ? "Hide" : "View"} applicants
                  </button>
                  {(expandedJob === job._id || (job.applicationCount || 0) > 0) && (
                    <button
                      type="button"
                      className="my-job-card-export-btn"
                      onClick={() => handleExport(job._id)}
                      disabled={exportingId === job._id}
                      title="Export applicants as CSV"
                    >
                      {exportingId === job._id ? "…" : "Export CSV"}
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="my-job-card-delete-btn"
                onClick={() => handleDelete(job._id, job.title)}
                disabled={deletingId === job._id}
                title="Delete job"
                aria-label={`Delete ${job.title}`}
              >
                {deletingId === job._id ? "…" : "−"}
              </button>
              {expandedJob === job._id && (
                <div className="my-job-applicants">
                  {applicants.length === 0 ? (
                    <p className="my-job-no-applicants">No applicants yet.</p>
                  ) : (
                    <ul>
                      {applicants.map((app) => (
                        <li key={app._id} className="applicant-item">
                          <div className="applicant-item-header">
                            <div>
                              <strong>{app.applicant?.name || app.firstName || app.email}</strong>
                              <a href={`mailto:${app.applicant?.email || app.email}`}>{app.applicant?.email || app.email}</a>
                            </div>
                            <StatusBadge status={app.status} />
                          </div>
                          {app.coverMessage && <p className="applicant-cover">{app.coverMessage}</p>}
                          <span className="applicant-date">
                            Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
