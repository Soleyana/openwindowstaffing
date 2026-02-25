/**
 * Fix recruiter password in MongoDB.
 * Run: node scripts/fix-recruiter-password.js <email> <password>
 * Example: node scripts/fix-recruiter-password.js recruiter@company.com mypassword
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");

const RECRUITER_EMAIL = process.argv[2];
const NEW_PASSWORD = process.argv[3];

if (!RECRUITER_EMAIL || !NEW_PASSWORD) {
  console.error("Usage: node scripts/fix-recruiter-password.js <email> <password>");
  process.exit(1);
}

async function fixRecruiterPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    console.log("Updating password for:", RECRUITER_EMAIL);

    const user = await User.findOne({ email: RECRUITER_EMAIL });
    if (!user) {
      console.error("No user found with email:", RECRUITER_EMAIL);
      console.log("Usage: node scripts/fix-recruiter-password.js <email> <password>");
      process.exit(1);
    }

    user.password = NEW_PASSWORD;
    await user.save();

    console.log("Success! Password updated for", user.email);
    console.log("You can now log in with:");
    console.log("  Email:", user.email);
    console.log("  Password:", NEW_PASSWORD);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixRecruiterPassword();
