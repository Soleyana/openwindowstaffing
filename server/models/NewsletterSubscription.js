const mongoose = require("mongoose");

const newsletterSubscriptionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true }
);

newsletterSubscriptionSchema.index({ email: 1 });
newsletterSubscriptionSchema.index({ unsubscribeToken: 1 });

module.exports = mongoose.model("NewsletterSubscription", newsletterSubscriptionSchema);
