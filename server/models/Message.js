const mongoose = require("mongoose");

const readBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileUrl: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MessageThread",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: { type: String, required: true },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    readBy: {
      type: [readBySchema],
      default: [],
    },
  },
  { timestamps: true }
);

messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ companyId: 1 });

module.exports = mongoose.model("Message", messageSchema);
