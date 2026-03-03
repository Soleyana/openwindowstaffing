/**
 * Invoice - real invoice generated from approved timesheets.
 * Multi-tenant: companyId-scoped.
 */
const mongoose = require("mongoose");

const INVOICE_STATUSES = ["draft", "issued", "paid", "void"];

const lineItemSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timesheetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Timesheet" }],
    description: { type: String },
    hours: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    invoiceNumber: { type: String, required: true },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "draft",
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    issuedAt: { type: Date },
    paidAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, status: 1, issuedAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;
