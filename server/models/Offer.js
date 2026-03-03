/**
 * Offer - formal job offer extending from Application, precedes Assignment.
 * Multi-tenant: companyId-scoped; candidateId for applicant ownership.
 */
const mongoose = require("mongoose");

const OFFER_STATUSES = ["draft", "sent", "accepted", "declined", "withdrawn"];

const offerSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payRate: { type: Number },
    billRate: { type: Number },
    startDate: { type: Date },
    scheduleNotes: { type: String },
    contractType: { type: String },
    status: {
      type: String,
      enum: OFFER_STATUSES,
      default: "draft",
    },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    withdrawnAt: { type: Date },
  },
  { timestamps: true }
);

offerSchema.index({ companyId: 1, status: 1 });
offerSchema.index({ companyId: 1, candidateId: 1 });
offerSchema.index({ jobId: 1 });
offerSchema.index({ applicationId: 1 });
offerSchema.index(
  { companyId: 1, applicationId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["draft", "sent"] } },
  }
);

module.exports = mongoose.model("Offer", offerSchema);
module.exports.OFFER_STATUSES = OFFER_STATUSES;
