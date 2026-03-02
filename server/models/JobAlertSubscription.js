/**
 * Job alert email subscriptions.
 * Used by /job-alerts page and weekly digest background job.
 */
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    keywords: { type: String, trim: true },
    category: { type: String, trim: true },
    location: { type: String, trim: true },
    lastDigestSentAt: { type: Date },
  },
  { timestamps: true }
);

subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ lastDigestSentAt: 1 });

module.exports = mongoose.model("JobAlertSubscription", subscriptionSchema);
