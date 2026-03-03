/**
 * TEMPORARY DEBUG SCRIPT - Run once to inspect Timesheet collection indexes.
 * Usage: node -r dotenv/config scripts/debug-timesheet-indexes.js
 * Remove after verification.
 */
const mongoose = require("mongoose");
const Timesheet = require("../models/Timesheet");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error("MONGODB_URI or MONGO_URI not set");
  process.exit(1);
}

mongoose.connect(uri).then(async () => {
  try {
    const indexes = await Timesheet.collection.indexes();
    console.log("=== Timesheet collection indexes (Mongo) ===\n");
    console.log(JSON.stringify(indexes, null, 2));
    console.log("\n=== Index summary ===");
    indexes.forEach((idx, i) => {
      const key = idx.key ? Object.keys(idx.key).join(", ") : "(unknown)";
      const unique = idx.unique ? " [UNIQUE]" : "";
      console.log(`${i + 1}. ${key}${unique}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}).catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
