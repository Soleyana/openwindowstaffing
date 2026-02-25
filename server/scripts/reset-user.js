/**
 * Deletes a user and recreates them fresh (fixes corrupt password hashes).
 * Run: node scripts/reset-user.js --email=x --password=y --name="Name"
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

function getArg(name) {
  const key = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(key));
  return arg ? arg.slice(key.length).trim() : null;
}

const EMAIL = (getArg("email") || process.env.EMAIL || "").toLowerCase().trim();
const PASSWORD = getArg("password") || process.env.PASSWORD || "";
const NAME = getArg("name") || process.env.NAME || "User";

if (!EMAIL) {
  console.error("❌ Email required: --email=your@email.com");
  process.exit(1);
}
if (!PASSWORD) {
  console.error("❌ Password required: --password=YourPass123");
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI or MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const deleted = await User.deleteOne({ email: EMAIL });
  console.log(deleted.deletedCount ? "✓ Deleted existing user" : "  (no existing user)");

  const user = await User.create({
    name: NAME,
    email: EMAIL,
    password: PASSWORD,
    role: "recruiter",
  });

  console.log("✅ Fresh recruiter created. Log in with:");
  console.log("   Email:", user.email);
  console.log("   Password:", PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
