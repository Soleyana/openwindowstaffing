const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    legalName: { type: String, trim: true },
    billingEmail: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    website: { type: String, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    complianceConfig: {
      requiredTypes: { type: [String], default: () => ["License", "BLS", "TB", "Background"] },
      optionalTypes: { type: [String], default: () => ["ACLS"] },
      expiringSoonDays: { type: Number, default: 30 },
    },
  },
  { timestamps: true }
);

companySchema.index({ ownerId: 1 });
companySchema.index({ status: 1 });

module.exports = mongoose.model("Company", companySchema);
