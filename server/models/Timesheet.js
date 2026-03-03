/**
 * Timesheet - time tracking for assignments.
 * Multi-tenant: companyId-scoped for recruiters; candidateId for applicant ownership.
 */
const mongoose = require("mongoose");

const TIMESHEET_STATUSES = ["draft", "submitted", "approved", "rejected", "paid"];

const entrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const timesheetSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    entries: {
      type: [entrySchema],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.every((e) => e && e.date && typeof e.hours === "number" && e.hours >= 0);
        },
        message: "Entries must have date and hours",
      },
    },
    status: {
      type: String,
      enum: TIMESHEET_STATUSES,
      default: "draft",
    },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

timesheetSchema.index({ companyId: 1, status: 1, periodStart: 1 });
timesheetSchema.index({ assignmentId: 1, periodStart: 1 });
timesheetSchema.index({ candidateId: 1, periodStart: -1 });
timesheetSchema.index({ companyId: 1, candidateId: 1 });
timesheetSchema.index(
  { companyId: 1, assignmentId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

timesheetSchema.virtual("totalHours").get(function () {
  if (!this.entries || !this.entries.length) return 0;
  return this.entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
});

timesheetSchema.set("toJSON", { virtuals: true });
timesheetSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Timesheet", timesheetSchema);
module.exports.TIMESHEET_STATUSES = TIMESHEET_STATUSES;
