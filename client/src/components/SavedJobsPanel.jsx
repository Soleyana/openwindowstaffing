import { Link } from "react-router-dom";

export default function SavedJobsPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  const savedJobs = [];

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
          {savedJobs.length === 0 ? (
            <p className="saved-jobs-empty">
              No saved jobs yet. Browse jobs and save the ones you&apos;re interested in.
            </p>
          ) : (
            <ul className="saved-jobs-list">
              {savedJobs.map((job) => (
                <li key={job.id}>
                  <Link to={`/jobs?id=${job.id}`} onClick={onClose}>
                    {job.title}
                  </Link>
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
