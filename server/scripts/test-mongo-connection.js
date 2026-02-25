/**
 * Test MongoDB Atlas connection.
 * Run from server folder: node scripts/test-mongo-connection.js
 * If this fails with "bad auth", fix your MONGODB_URI in .env (see comments below).
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function test() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is not set in .env");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    if (err.message?.toLowerCase().includes("bad auth")) {
      console.log("\n--- Fix MongoDB Atlas \"bad auth\" ---");
      console.log("1. MongoDB Atlas > Database Access: Check username/password");
      console.log("2. MongoDB Atlas > Network Access: Add your IP or use 0.0.0.0/0 for dev");
      console.log("3. If the password has special chars (@, #, etc), URL-encode them in .env");
      console.log("   Example: @ becomes %40");
      process.exit(1);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

test();
