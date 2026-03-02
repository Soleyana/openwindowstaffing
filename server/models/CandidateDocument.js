const mongoose = require("mongoose");

const DOCUMENT_TYPES = ["Resume", "License", "BLS", "ACLS", "TB", "Background", "Other"];
const VERIFIED_STATUSES = ["pending", "verified", "rejected"];
const VERIFIED_STATUSES_LEGACY = ["Pending", "Verified", "Rejected"];
const STORAGE_PROVIDERS = ["local", "s3", "r2"];

const candidateDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    type: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    fileUrl: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    fileKey: { type: String },
    storageProvider: {
      type: String,
      enum: STORAGE_PROVIDERS,
      default: "local",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: { type: Date },
    verifiedStatus: {
      type: String,
      enum: [...VERIFIED_STATUSES, ...VERIFIED_STATUSES_LEGACY],
      default: "pending",
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

candidateDocumentSchema.index({ userId: 1 });
candidateDocumentSchema.index({ userId: 1, type: 1 });
candidateDocumentSchema.index({ userId: 1, verifiedStatus: 1 });
candidateDocumentSchema.index({ userId: 1, expiresAt: 1 });
candidateDocumentSchema.index({ companyId: 1 });
candidateDocumentSchema.index({ expiresAt: 1 });
candidateDocumentSchema.index({ verifiedStatus: 1 });

module.exports = mongoose.model("CandidateDocument", candidateDocumentSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.VERIFIED_STATUSES = VERIFIED_STATUSES;
