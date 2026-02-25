const mongoose = require("mongoose");
const { DEFAULT_COMPANY } = require("../config/env");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "travel"],
      required: [true, "Job type is required"],
    },
    category: {
      type: String,
      enum: ["RN", "LPN", "CNA", "nursing", "allied-health", "therapy", "travel-nursing", "administrative", "physician-provider", "behavioral-health", "pharmacy", "diagnostic-imaging", "home-health", "leadership", "other-healthcare"],
      default: "other-healthcare",
    },
    shift: { type: String, trim: true },
    salary: { type: String, trim: true },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "travel"],
      trim: true,
    },
    specialty: {
      type: String,
      trim: true,
    },
    payRate: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      default: DEFAULT_COMPANY,
      trim: true,
    },
    companyWebsite: { type: String, trim: true },
    companyEmail: { type: String, trim: true },
    companyContactPhone: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
