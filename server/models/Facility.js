const mongoose = require("mongoose");

const facilityAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Facility name is required"],
      trim: true,
    },
    address: {
      type: facilityAddressSchema,
      default: () => ({}),
    },
    departments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    complianceOverrides: {
      requiredTypes: { type: [String] },
    },
  },
  { timestamps: true }
);

facilitySchema.index({ companyId: 1 });

module.exports = mongoose.model("Facility", facilitySchema);
