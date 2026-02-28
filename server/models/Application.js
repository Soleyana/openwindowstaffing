const mongoose = require("mongoose");
const { ALLOWED_STATUSES, DEFAULT_STATUS } = require("../constants/applicationStatuses");

const recruiterNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  authorizedToWork: { type: String },
  requireVisaSponsorship: { type: String },
  highestDegree: { type: String },
  schoolName: { type: String },
  graduationYear: { type: String },
  gpa: { type: String },
  yearsExperience: { type: String },
  currentJobTitle: { type: String },
  currentEmployer: { type: String },
  hasLicense: { type: String },
  licenseType: { type: String },
  licenseNumber: { type: String },
  licenseState: { type: String },
  certifications: { type: String },
  specialty: { type: String },
  shiftPreference: { type: String },
  availableStartDate: { type: String },
  willingToTravel: { type: String },
  message: { type: String },
  resumeUrl: { type: String },
  signature: { type: String },
  signatureDate: { type: String },
  status: {
    type: String,
    enum: ALLOWED_STATUSES,
    default: DEFAULT_STATUS,
  },
  recruiterNotes: {
    type: [recruiterNoteSchema],
    default: [],
    select: false,
  },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastUpdatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Application", applicationSchema);
