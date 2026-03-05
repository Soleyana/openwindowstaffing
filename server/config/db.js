const mongoose = require("mongoose");

mongoose.set("strictPopulate", false);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    require("../utils/logger").info("MongoDB connected");
    const Invite = require("../models/Invite");
    await Invite.collection.dropIndex("token_1").catch(() => {});
  } catch (error) {
    require("../utils/logger").error({ err: error.message }, "MongoDB connection error");
    process.exit(1);
  }
};

module.exports = connectDB;
