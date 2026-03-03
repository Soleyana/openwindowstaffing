/**
 * In-app notifications.
 * userId = recipient; companyId optional for company-scoped.
 */
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String },
    url: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
