const mongoose = require("mongoose");

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
      enum: ["nursing", "allied-health", "therapy", "administrative", "other-healthcare"],
      default: "other-healthcare",
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
      default: "Open Window Staffing",
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
