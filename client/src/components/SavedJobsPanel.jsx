import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSavedJobs, unsaveJob } from "../api/savedJobs";

export default function SavedJobsPanel({ isOpen, onClose }) {
  const { isLoggedIn } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      setLoading(true);
      getSavedJobs()
        .then((res) => setJobs(res.data || []))
        .catch(() => setJobs([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  async function handleUnsave(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div
        className="saved-jobs-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close saved jobs panel"
      />
      <div className="saved-jobs-panel" role="dialog" aria-label="Saved jobs">
        <div className="saved-jobs-header">
          <h3 className="saved-jobs-title">SAVED JOBS</h3>
          <button
            type="button"
            className="saved-jobs-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="saved-jobs-body">
          {!isLoggedIn ? (
            <p className="saved-jobs-empty">
              <Link to="/login" onClick={onClose}>Sign in</Link> to save jobs.
            </p>
          ) : loading ? (
            <p className="saved-jobs-empty">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="saved-jobs-empty">
              No saved jobs yet. Browse jobs and save the ones you&apos;re interested in.
            </p>
          ) : (
            <ul className="saved-jobs-list">
              {jobs.map((job) => (
                <li key={job._id}>
                  <Link to={`/jobs/${job._id}`} onClick={onClose}>
                    {job.title}
                  </Link>
                  <button
                    type="button"
                    className="saved-jobs-remove"
                    onClick={(e) => handleUnsave(e, job._id)}
                    aria-label="Remove from saved"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/jobs"
            className="saved-jobs-browse"
            onClick={onClose}
          >
            Browse jobs
          </Link>
        </div>
      </div>
    </>
  );
}
