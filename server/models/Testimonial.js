const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
    authorRole: { type: String, trim: true, maxlength: 80, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 1200 },
    source: {
      type: String,
      enum: ["public_form", "candidate", "recruiter", "admin_seed"],
      default: "public_form",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "hidden"],
      default: "pending",
      index: true,
    },
    approvedAt: { type: Date },
    rejectedReason: { type: String, trim: true, maxlength: 300 },
    consentToPublish: { type: Boolean, required: true, default: true },
    email: { type: String, trim: true, select: false },
    ipHash: { type: String, select: false },
    userAgent: { type: String, select: false },
    verifyTokenHash: { type: String, select: false },
    verifyExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

testimonialSchema.index({ companyId: 1, status: 1, createdAt: -1 });
testimonialSchema.index({ companyId: 1, rating: 1, createdAt: -1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);
