/**
 * Contract - signed agreement tied to an Offer.
 * Multi-tenant: companyId-scoped; candidateId for applicant ownership.
 * MVP: contractHtml snapshot, typed signature, no external e-sign vendor.
 */
const mongoose = require("mongoose");

const CONTRACT_STATUSES = ["draft", "sent", "signed"];

const contractSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    templateFile: { type: String },
    contractHtml: { type: String },
    status: {
      type: String,
      enum: CONTRACT_STATUSES,
      default: "draft",
    },
    sentAt: { type: Date },
    signedAt: { type: Date },
    signatureName: { type: String },
    signatureIp: { type: String },
    signatureUserAgent: { type: String },
    signedPdfPath: { type: String },
    signedHtmlSnapshot: { type: String },
  },
  { timestamps: true }
);

contractSchema.index({ companyId: 1, status: 1 });
contractSchema.index({ offerId: 1 }, { unique: true });
contractSchema.index({ candidateId: 1 });

module.exports = mongoose.model("Contract", contractSchema);
module.exports.CONTRACT_STATUSES = CONTRACT_STATUSES;
