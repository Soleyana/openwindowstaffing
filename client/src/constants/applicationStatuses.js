/**
 * Application status constants. Matches server constants.
 * Use for recruiter pipeline and applicant-facing display.
 */

export const PIPELINE_STATUSES = [
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

export const PIPELINE_COLUMN_LABELS = {
  applied: "Applied",
  reviewing: "Reviewing",
  contacted: "Contacted",
  submitted_to_facility: "Submitted to Facility",
  interview_scheduled: "Interview Scheduled",
  offer_received: "Offer",
  placed: "Placed",
  assignment_completed: "Completed",
  rejected: "Rejected",
};

export const APPLICANT_STATUSES = {
  APPLIED: "applied",
  UNDER_REVIEW: "under review",
  OFFER: "offer",
  PLACED: "placed",
  NOT_SELECTED: "not selected",
};

/** Map legacy DB status to pipeline status for display */
export const LEGACY_TO_PIPELINE = {
  pending: "applied",
  new: "applied",
  accepted: "offer_received",
  contacted: "contacted",
  interview: "interview_scheduled",
  hired: "placed",
  rejected: "rejected",
};

export function toPipelineStatus(status) {
  if (PIPELINE_STATUSES.includes(status)) return status;
  return LEGACY_TO_PIPELINE[status] || "applied";
}
