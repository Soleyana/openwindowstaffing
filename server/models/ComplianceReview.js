const mongoose = require("mongoose");

const complianceReviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
    note: { type: String },
  },
  { timestamps: true }
);

complianceReviewSchema.index({ companyId: 1, candidateId: 1, reviewedAt: -1 });

module.exports = mongoose.model("ComplianceReview", complianceReviewSchema);
