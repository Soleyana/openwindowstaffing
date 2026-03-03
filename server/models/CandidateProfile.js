const mongoose = require("mongoose");

const licenseSchema = new mongoose.Schema(
  {
    hasLicense: { type: Boolean, default: false },
    licenseNumber: { type: String, trim: true },
    licenseState: { type: String, trim: true },
    licenseType: { type: String, trim: true },
    number: { type: String, trim: true }, // alias for backward compat
    state: { type: String, trim: true },
    type: { type: String, trim: true },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    expiresAt: { type: Date },
  },
  { _id: true }
);

const workHistorySchema = new mongoose.Schema(
  {
    employer: { type: String },
    title: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    description: { type: String },
  },
  { _id: true }
);

const candidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: { type: String, trim: true },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zip: { type: String, trim: true },
    },
    yearsExperience: { type: Number },
    specialties: {
      type: [String],
      default: [],
    },
    shiftPreference: { type: String, trim: true },
    travelWillingness: { type: String, trim: true },
    earliestStartDate: { type: Date },
    license: {
      type: licenseSchema,
      default: () => ({}),
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    workHistory: {
      type: [workHistorySchema],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    summary: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CandidateProfile", candidateProfileSchema);
