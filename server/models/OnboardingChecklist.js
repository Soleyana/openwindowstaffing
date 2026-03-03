/**
 * OnboardingChecklist - persisted checklist progress.
 * Keyed by userId; companyId optional (for employer checklist).
 */
const mongoose = require("mongoose");

const onboardingChecklistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    markedComplete: {
      reviewPipeline: { type: Date },
      checkInbox: { type: Date },
    },
  },
  { timestamps: true }
);

onboardingChecklistSchema.index({ userId: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model("OnboardingChecklist", onboardingChecklistSchema);
