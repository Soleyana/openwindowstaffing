import {
  APPLICANT_STATUSES,
  PIPELINE_STATUSES,
  PIPELINE_COLUMN_LABELS,
  toPipelineStatus,
} from "../constants/applicationStatuses";

const APPLICANT_OPTIONS = Object.values(APPLICANT_STATUSES);

/** For recruiter views: shows pipeline status with column label */
function PipelineStatusBadge({ status }) {
  const safeStatus = toPipelineStatus(status);
  const label = PIPELINE_COLUMN_LABELS[safeStatus] || safeStatus;
  return (
    <span className={`status-badge status-pipeline status-${safeStatus.replace(/_/g, "-")}`}>
      {label}
    </span>
  );
}

/** For applicant views: shows simplified status */
function ApplicantStatusBadge({ status }) {
  const displayStatus = status === "withdrawn" ? "Withdrawn" : (APPLICANT_OPTIONS.includes(status) ? status : APPLICANT_STATUSES.APPLIED);
  const safeStatus = (status === "withdrawn" ? "withdrawn" : (APPLICANT_OPTIONS.includes(status) ? status : APPLICANT_STATUSES.APPLIED)).replace(/\s+/g, "-");
  return (
    <span className={`status-badge status-${safeStatus}`}>
      {displayStatus}
    </span>
  );
}

export default function StatusBadge({ status, variant = "applicant" }) {
  if (variant === "recruiter") {
    return <PipelineStatusBadge status={status} />;
  }
  return <ApplicantStatusBadge status={status} />;
}
