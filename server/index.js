require("dotenv").config();

const logger = require("./utils/logger");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const requestIdMiddleware = require("./middleware/requestId");
const { authLimiter, contactLimiter } = require("./middleware/rateLimiter");
const { maybeRateLimit } = require("./middleware/maybeRateLimit");
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
const companyRoutes = require("./routes/companyRoutes");
const facilityRoutes = require("./routes/facilityRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const documentRoutes = require("./routes/documentRoutes");
const activityRoutes = require("./routes/activityRoutes");
const savedJobRoutes = require("./routes/savedJobRoutes");
const staffingRequestRoutes = require("./routes/staffingRequestRoutes");
const jobAlertRoutes = require("./routes/jobAlertRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reportRoutes = require("./routes/reportRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");

const app = express();

app.use(requestIdMiddleware);
const isProduction = process.env.NODE_ENV === "production";
const corsOrigin = CORS_ORIGINS.length > 0
  ? CORS_ORIGINS
  : isProduction
    ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ["http://localhost:5173"])
    : true;
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
}));
app.use((req, res, next) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
  }, "request");
  next();
});
app.use(cookieParser());
const responseFormatter = require("./middleware/responseFormatter");
app.use(responseFormatter);

app.use(express.json());

/* Health checks */
app.get("/", (req, res) => res.json({ status: "API running" }));
app.get("/api/status", (_, res) => res.json({ ok: true, service: "api" }));
app.get("/api/version", (req, res) => {
  const version =
    process.env.RENDER_GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "dev";
  res.json({ ok: true, version });
});

/* Dev-only: CORS/cookie diagnostics for "works locally but not in prod" */
if (process.env.NODE_ENV !== "production") {
  const { getAuthCookieOptions, isCrossSiteCookiesEnabled } = require("./utils/cookieOptions");
  app.get("/api/diagnostics/cors", (req, res) => {
    const opts = getAuthCookieOptions(req);
    res.json({
      origin: req.get("origin") || "(none)",
      cookieOptions: {
        httpOnly: opts.httpOnly,
        path: opts.path,
        secure: opts.secure,
        sameSite: opts.sameSite,
      },
      allowedOrigins: Array.isArray(corsOrigin) ? corsOrigin : "(dynamic/true)",
      isCrossSiteCookiesEnabled: isCrossSiteCookiesEnabled(),
    });
  });
}

app.get("/api/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    await mongoose.connection.db.admin().ping();
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      message: err.message || "Database unavailable",
    });
  }
});

app.use("/uploads", express.static("uploads"));
app.use("/api/auth", maybeRateLimit(authLimiter), authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/recruiter", recruiterApplicationRoutes);
app.use("/api/contact", maybeRateLimit(contactLimiter), contactRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/staffing-requests", staffingRequestRoutes);
app.use("/api/job-alerts", jobAlertRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/testimonials", testimonialRoutes);

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

const ROUTE_PREFIXES = [
  "/api/auth",
  "/api/jobs",
  "/api/applications",
  "/api/invites",
  "/api/recruiter",
  "/api/contact",
  "/api/companies",
  "/api/facilities",
  "/api/candidates",
  "/api/documents",
  "/api/activity",
  "/api/saved-jobs",
  "/api/staffing-requests",
  "/api/job-alerts",
  "/api/messages",
  "/api/reports",
  "/api/invoices",
  "/api/newsletter",
  "/api/testimonials",
];

const startServer = async () => {
  await connectDB();
  app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info({ mountedRoutes: ROUTE_PREFIXES }, "Mounted route prefixes");
    try {
      const { startJobs } = require("./jobs");
      await startJobs();
    } catch (err) {
      logger.warn({ err: err.message }, "Background jobs not started");
    }
  });
};

startServer();
