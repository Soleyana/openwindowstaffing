const mongoose = require("mongoose");

const TARGET_TYPES = ["Application", "Candidate", "Job", "Document", "CandidateDocument", "Invite", "Company", "Facility", "MessageThread", "Message", "InvoiceRequest", "Contact", "User", "Testimonial"];
const ACTION_TYPES = [
  "created",
  "updated",
  "deleted",
  "submitted",
  "status_changed",
  "downloaded",
  "verified",
  "rejected",
  "document_verified",
  "document_rejected",
  "invite_created",
  "invite_sent",
  "invite_revoked",
  "invite_accepted",
  "invoice_requested",
  "invoice_requested_email_sent",
  "password_reset_sent",
  "contact_submitted_email_sent",
  "company_created",
  "company_updated",
  "facility_created",
  "facility_updated",
  "testimonial_submitted",
  "testimonial_approved",
  "testimonial_rejected",
  "testimonial_hidden",
  "testimonial_deleted",
];

const activityLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetType: {
      type: String,
      enum: TARGET_TYPES,
    },
    targetId: { type: mongoose.Schema.Types.Mixed },
    actionType: {
      type: String,
      enum: ACTION_TYPES,
    },
    message: { type: String },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ companyId: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });
activityLogSchema.index({ actorUserId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
module.exports.TARGET_TYPES = TARGET_TYPES;
module.exports.ACTION_TYPES = ACTION_TYPES;
