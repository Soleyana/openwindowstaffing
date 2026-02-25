/**
 * Creates the initial owner when the database has no users.
 * Recruiters must be created via the invite flow (owner invites by email).
 *
 * Run from server folder: node scripts/create-initial-owner.js
 *
 * Options (any works):
 *   1. Env vars: EMAIL, PASSWORD, NAME
 *   2. CLI args: node scripts/create-initial-owner.js --email=x --password=y --name="Jane Owner"
 *
 * Windows PowerShell:
 *   $env:EMAIL="x"; $env:PASSWORD="y"; $env:NAME="Jane"; node scripts/create-initial-owner.js
 *
 * Linux/Mac:
 *   EMAIL=x PASSWORD=y NAME="Jane" node scripts/create-initial-owner.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { ROLES } = require("../constants/roles");

function getArg(name) {
  const key = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(key));
  return arg ? arg.slice(key.length).trim() : null;
}

const EMAIL = getArg("email") || process.env.EMAIL;
const PASSWORD = getArg("password") || process.env.PASSWORD;
const NAME = getArg("name") || process.env.NAME || "Owner";

if (!EMAIL || !PASSWORD) {
  console.error("Required: --email=... and --password=... (or set EMAIL and PASSWORD env vars)");
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI or MONGODB_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const count = await User.countDocuments();
  if (count > 0) {
    console.log("Users already exist. Use the app:");
    console.log("  - First registered user becomes owner. Register at /signup");
    console.log("  - Recruiters: owner must invite them via the recruiter dashboard");
    process.exit(0);
    return;
  }

  const existing = await User.findOne({ email: EMAIL.toLowerCase() });
  if (existing) {
    console.log("User already exists with that email.");
    process.exit(1);
  }

  const user = await User.create({
    name: NAME,
    email: EMAIL.toLowerCase(),
    password: PASSWORD,
    role: ROLES.OWNER,
  });
  console.log("✅ Initial owner created. Log in with:");
  console.log("   Email:", user.email);
  console.log("   Password: (what you set)");
  console.log("You can now invite recruiters from the recruiter dashboard.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
