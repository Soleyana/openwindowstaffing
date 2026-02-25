/**
 * Application status constants for the recruiter pipeline.
 * Single source of truth for status values. Shared across backend.
 */

/** Canonical ATS pipeline statuses - use for Mongoose enum and validation */
const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "contacted",
  "submitted_to_facility",
  "interview_scheduled",
  "offer_received",
  "placed",
  "assignment_completed",
  "rejected",
];

/** Readable labels for each status */
const STATUS_LABELS = {
  applied: "Applied",
  reviewing: "Reviewing",
  contacted: "Contacted",
  submitted_to_facility: "Submitted to Facility",
  interview_scheduled: "Interview Scheduled",
  offer_received: "Offer Received",
  placed: "Placed",
  assignment_completed: "Assignment Completed",
  rejected: "Rejected",
};

const DEFAULT_STATUS = "applied";

/** Alias for pipeline usage */
const PIPELINE_STATUSES = ALLOWED_STATUSES;

/** Applicant-facing statuses - simplified view for job seekers */
const APPLICANT_STATUSES = {
  APPLIED: "applied",
  UNDER_REVIEW: "under review",
  OFFER: "offer",
  PLACED: "placed",
  NOT_SELECTED: "not selected",
};

/** Map internal pipeline status to applicant-facing status */
const PIPELINE_TO_APPLICANT = {
  applied: APPLICANT_STATUSES.APPLIED,
  reviewing: APPLICANT_STATUSES.UNDER_REVIEW,
  contacted: APPLICANT_STATUSES.UNDER_REVIEW,
  submitted_to_facility: APPLICANT_STATUSES.UNDER_REVIEW,
  interview_scheduled: APPLICANT_STATUSES.UNDER_REVIEW,
  offer_received: APPLICANT_STATUSES.OFFER,
  placed: APPLICANT_STATUSES.PLACED,
  assignment_completed: APPLICANT_STATUSES.PLACED,
  rejected: APPLICANT_STATUSES.NOT_SELECTED,
};

/** Legacy status mapping for existing records */
const LEGACY_TO_PIPELINE = {
  pending: "applied",
  new: "applied",
  accepted: "offer_received",
  contacted: "contacted",
  interview: "interview_scheduled",
  hired: "placed",
  rejected: "rejected",
};

function toApplicantStatus(internalStatus) {
  if (PIPELINE_TO_APPLICANT[internalStatus]) {
    return PIPELINE_TO_APPLICANT[internalStatus];
  }
  const mapped = LEGACY_TO_PIPELINE[internalStatus];
  return mapped ? PIPELINE_TO_APPLICANT[mapped] : APPLICANT_STATUSES.APPLIED;
}

function toPipelineStatus(status) {
  if (PIPELINE_STATUSES.includes(status)) return status;
  return LEGACY_TO_PIPELINE[status] || DEFAULT_STATUS;
}

function isValidPipelineStatus(status) {
  return status && PIPELINE_STATUSES.includes(status);
}

module.exports = {
  ALLOWED_STATUSES,
  STATUS_LABELS,
  PIPELINE_STATUSES,
  DEFAULT_STATUS,
  APPLICANT_STATUSES,
  PIPELINE_TO_APPLICANT,
  LEGACY_TO_PIPELINE,
  toApplicantStatus,
  toPipelineStatus,
  isValidPipelineStatus,
};
