require("dotenv").config();

const logger = require("./utils/logger");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const { CORS_ORIGINS, PORT } = require("./config/env");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const inviteRoutes = require("./routes/inviteRoutes");
const recruiterApplicationRoutes = require("./routes/recruiterApplicationRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, "request");
    next();
  });
}

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));
app.use(cookieParser());

app.get("/api/applications/ping", (_, res) => res.json({ ok: true }));
app.use(express.json());

/* Health checks */
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});

app.get("/api/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    await mongoose.connection.db.admin().ping();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      message: err.message || "Database unavailable",
    });
  }
});

app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/recruiter", recruiterApplicationRoutes);
app.use("/api/contact", contactRoutes);

/* 404 – unknown routes */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* Multer / upload errors */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max 5MB." });
    }
    return res.status(400).json({ success: false, message: err.message || "Upload error" });
  }
  if (err.message?.includes("Only PDF")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

/* 500 – server error handling */
app.use((err, req, res, next) => {
  logger.error({ err: { message: err.message, stack: err.stack } }, "Unhandled error");
  const raw = (err.message || "").toLowerCase();
  const isDbError =
    raw.includes("bad auth") ||
    raw.includes("authentication failed") ||
    raw.includes("mongo") ||
    raw.includes("econnrefused");
  const message = isDbError
    ? "Database connection error. Check MongoDB Atlas: Network Access (IP allowlist), username/password in .env, and that the password has no unencoded special characters."
    : (err.message || "Internal server error");
  res.status(500).json({
    success: false,
    message,
  });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();
