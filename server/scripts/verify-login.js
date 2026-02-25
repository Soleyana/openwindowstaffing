/**
 * Verifies that a user can log in with the given credentials.
 * Run: node scripts/verify-login.js --email=x --password=y
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

function getArg(name) {
  const key = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(key));
  return arg ? arg.slice(key.length).trim() : null;
}

const EMAIL = getArg("email") || process.env.EMAIL;
const PASSWORD = getArg("password") || process.env.PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Required: --email=... and --password=... (or set EMAIL and PASSWORD env vars)");
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGO_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const user = await User.findOne({ email: EMAIL.toLowerCase() }).select("+password");
  if (!user) {
    console.log("❌ No user found with email:", EMAIL);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log("✓ User found:", user.email, "| role:", user.role);

  const match = await user.comparePassword(PASSWORD);
  if (match) {
    console.log("✓ Password MATCHES - login should work");
  } else {
    console.log("❌ Password DOES NOT MATCH - try a different password or re-run create-recruiter");
  }

  await mongoose.disconnect();
  process.exit(match ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
