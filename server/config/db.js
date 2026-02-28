const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    require("../utils/logger").info("MongoDB connected");
  } catch (error) {
    require("../utils/logger").error({ err: error.message }, "MongoDB connection error");
    process.exit(1);
  }
};

module.exports = connectDB;
