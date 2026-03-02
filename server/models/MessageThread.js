const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["candidate", "recruiter", "owner"], default: "candidate" },
  },
  { _id: false }
);

const messageThreadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    participants: {
      type: [participantSchema],
      default: [],
    },
    subject: { type: String, trim: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageThreadSchema.index({ companyId: 1, lastMessageAt: -1 });
messageThreadSchema.index({ applicationId: 1 });

module.exports = mongoose.model("MessageThread", messageThreadSchema);
