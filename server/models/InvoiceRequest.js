const mongoose = require("mongoose");

const invoiceRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "processed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

invoiceRequestSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("InvoiceRequest", invoiceRequestSchema);
