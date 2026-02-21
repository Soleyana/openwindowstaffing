import { Link } from "react-router-dom";

export default function JobCard({ job }) {
  const createdDate = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const postedAgo =
    job.createdAt
      ? (() => {
          const diff = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 0) return "Today";
          if (diff === 1) return "Yesterday";
          if (diff < 30) return `${diff} days ago`;
          if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
          return `${Math.floor(diff / 365)} years ago`;
        })()
      : "—";

  const jobTypeLabel =
    job.jobType === "full-time"
      ? "Full Time"
      : job.jobType === "part-time"
        ? "Part Time"
        : job.jobType === "contract"
          ? "Contract"
          : job.jobType === "travel"
            ? "Travel"
            : job.jobType || "—";

  const badgeClass =
    job.jobType === "full-time"
      ? "job-card-badge job-card-badge--fulltime"
      : job.jobType === "part-time"
        ? "job-card-badge job-card-badge--parttime"
        : "job-card-badge job-card-badge--other";

  return (
    <Link to={`/jobs/${job._id}`} className="job-card">
      <div className="job-card-icon" aria-hidden="true">
        <span className="job-card-icon-symbol">✚</span>
      </div>
      <div className="job-card-body">
        <h3 className="job-card-title">{job.title}</h3>
        <div className="job-card-meta">
          <span className="job-card-meta-item">
            <span className="job-card-meta-icon" aria-hidden="true">🏢</span>
            {job.company}
          </span>
          <span className="job-card-meta-item">
            <span className="job-card-meta-icon" aria-hidden="true">📍</span>
            {job.location}
          </span>
          {job.payRate && (
            <span className="job-card-meta-item">
              <span className="job-card-meta-icon" aria-hidden="true">💰</span>
              {job.payRate}
            </span>
          )}
        </div>
      </div>
      <div className="job-card-right">
        <span className={badgeClass}>{jobTypeLabel}</span>
        <p className="job-card-date">Posted {postedAgo}</p>
      </div>
    </Link>
  );
}
