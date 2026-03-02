const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "recruiter"],
      default: "recruiter",
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });
membershipSchema.index({ companyId: 1 });

module.exports = mongoose.model("RecruiterMembership", membershipSchema);
