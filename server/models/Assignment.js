/**
 * Assignment (Placement) - connects Application to active placement.
 * Multi-tenant: companyId-scoped; candidateId for applicant ownership.
 */
const mongoose = require("mongoose");

const ASSIGNMENT_STATUSES = [
  "drafted",
  "offered",
  "accepted",
  "active",
  "completed",
  "cancelled",
];

const payRateSchema = new mongoose.Schema(
  {
    billRate: { type: Number },
    payRate: { type: Number },
    currency: { type: String, default: "USD" },
    unit: { type: String, enum: ["hour", "shift"], default: "hour" },
  },
  { _id: false }
);

const shiftInfoSchema = new mongoose.Schema(
  {
    type: { type: String },
    hoursPerWeek: { type: Number },
    scheduleNotes: { type: String },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: "drafted",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    payRate: { type: payRateSchema },
    shiftInfo: { type: shiftInfoSchema },
    offeredAt: { type: Date },
    acceptedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assignmentSchema.index({ companyId: 1, status: 1 });
assignmentSchema.index({ companyId: 1, candidateId: 1 });
assignmentSchema.index({ companyId: 1, jobId: 1 });
assignmentSchema.index({ candidateId: 1, status: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
