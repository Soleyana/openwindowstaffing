/**
 * Minimal staffing request (client order) model.
 * Represents a request from a company/facility for staffing.
 * Expand in next milestone: line items, rates, PO numbers, status workflow.
 */
const mongoose = require("mongoose");

const staffingRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    role: { type: String, trim: true },
    shift: { type: String, trim: true },
    startDate: { type: Date },
    payRange: { type: String, trim: true },
    notes: { type: String },
    category: { type: String },
    quantity: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["open", "in_progress", "filled", "closed", "draft", "submitted", "cancelled"],
      default: "open",
    },
  },
  { timestamps: true }
);

staffingRequestSchema.index({ companyId: 1 });
staffingRequestSchema.index({ status: 1 });

module.exports = mongoose.model("StaffingRequest", staffingRequestSchema);
