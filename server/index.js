require("dotenv").config();

const logger = require("./utils/logger");
const { validateEnv } = require("./utils/validateEnv");

/* Production config validator: fail-fast if required env missing/invalid */
validateEnv({ logger });
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const requestIdMiddleware = require("./middleware/requestId");
const { contactLimiter, clientErrorLimiter } = require("./middleware/rateLimiter");
const { maybeRateLimit } = require("./middleware/maybeRateLimit");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const { CORS_ORIGINS, PORT, isProduction, MAX_RESUME_SIZE_MB, MAX_CREDENTIAL_SIZE_MB } = require("./config/env");

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
const assignmentRoutes = require("./routes/assignmentRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const offerRoutes = require("./routes/offerRoutes");
const contractRoutes = require("./routes/contractRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const securityRoutes = require("./routes/securityRoutes");
const { csrfMiddleware } = require("./middleware/csrf");

const app = express();

/* Render proxy: trust X-Forwarded-* headers */
app.set("trust proxy", 1);

/* Security headers - CSP minimal to avoid breaking API/JSON responses */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(requestIdMiddleware);
/* CORS: allowlist from env. Set CORS_ORIGINS (comma-separated) in Render. */
const defaultOrigins = ["http://localhost:5173", "http://localhost:5176"];
const allOrigins =
  CORS_ORIGINS?.length > 0
    ? CORS_ORIGINS
    : isProduction
      ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : defaultOrigins)
      : defaultOrigins;
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-CSRF-Token"],
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logPayload = {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
    };
    if (req.user?._id) logPayload.userId = req.user._id.toString();
    if (req.companyIdResolved) logPayload.companyId = req.companyIdResolved.toString?.() || req.companyIdResolved;
    logger.info(logPayload, `request ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});
app.use(cookieParser());
const responseFormatter = require("./middleware/responseFormatter");
app.use(responseFormatter);

app.use(express.json());

/* CSRF protection for /api state-changing routes (GET/HEAD/OPTIONS bypass) */
app.use("/api", csrfMiddleware);

/* Health checks – in dev only; in production / serves the SPA */
if (!isProduction) {
  app.get("/", (req, res) => res.json({ status: "API running" }));
}
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
      allowedOrigins: allOrigins,
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

/* Deployment health: ready = DB connected, live = process up */
app.get("/api/health/ready", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ ok: true, db: "connected" });
  } catch (err) {
    res.status(503).json({ ok: false, db: "disconnected" });
  }
});
app.get("/api/health/live", (_, res) => res.status(200).json({ ok: true }));

/* Client error reporting (rate limited) – minimal payload, no sensitive data */
app.post("/api/client-errors", clientErrorLimiter, express.json(), (req, res) => {
  const { route, message, stackSnippet } = req.body || {};
  const safeRoute = typeof route === "string" ? route.slice(0, 500) : undefined;
  const safeMessage = typeof message === "string" ? message.slice(0, 500) : undefined;
  const safeStack = typeof stackSnippet === "string" ? stackSnippet.slice(0, 1000) : undefined;
  if (safeRoute || safeMessage || safeStack) {
    logger.warn({
      requestId: req.requestId,
      source: "client",
      route: safeRoute,
      message: safeMessage,
      stackSnippet: safeStack,
    }, "Client error reported");
  }
  res.status(202).json({ ok: true });
});

app.use("/uploads", express.static("uploads"));
app.use("/api/security", securityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/recruiter", recruiterApplicationRoutes);
app.use("/api/contact", maybeRateLimit(contactLimiter, "/api/contact"), contactRoutes);
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
app.use("/api/assignments", assignmentRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

/* Production: serve React build from same origin (avoids cross-origin cookies on mobile) */
if (isProduction) {
  const distPath = path.join(__dirname, "../client/dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

/* 404 – unknown routes. Only return JSON for /api; SPA fallback for non-API in production. */
app.use((req, res) => {
  if (isProduction && !req.path.startsWith("/api")) {
    const distPath = path.join(__dirname, "../client/dist");
    if (fs.existsSync(distPath)) {
      return res.sendFile(path.join(distPath, "index.html"));
    }
  }
  res.status(404).json({ success: false, message: "Route not found" });
});

/* Multer / upload errors – 400 with requestId */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const isResume = (req.path || "").includes("/applications/submit");
      const maxMb = isResume ? MAX_RESUME_SIZE_MB : MAX_CREDENTIAL_SIZE_MB;
      const body = { success: false, message: `File too large. Max ${maxMb}MB.` };
      if (req.requestId) body.requestId = req.requestId;
      return res.status(400).json(body);
    }
    const body = { success: false, message: err.message || "Upload error" };
    if (req.requestId) body.requestId = req.requestId;
    return res.status(400).json(body);
  }
  if (err.message && (err.message.includes("Only ") || err.message.toLowerCase().includes("allowed"))) {
    const body = { success: false, message: err.message };
    if (req.requestId) body.requestId = req.requestId;
    return res.status(400).json(body);
  }
  next(err);
});

/* 500 – server error handling (dedicated error logger: stack in non-prod, message only in prod) */
app.use((err, req, res, next) => {
  const payload = { requestId: req.requestId, message: err.message || "Internal server error" };
  if (req.user?._id) payload.userId = req.user._id.toString();
  if (req.companyIdResolved) payload.companyId = (req.companyIdResolved.toString && req.companyIdResolved.toString()) || String(req.companyIdResolved);
  payload.route = req.originalUrl || req.url;
  payload.statusCode = 500;
  if (!isProduction) {
    payload.stack = err.stack;
  }
  logger.error(payload, "Unhandled error");
  const raw = (err.message || "").toLowerCase();
  const isDbError =
    raw.includes("bad auth") ||
    raw.includes("authentication failed") ||
    raw.includes("mongo") ||
    raw.includes("econnrefused");
  const message = isDbError
    ? "Database connection error. Check MongoDB Atlas: Network Access (IP allowlist), username/password in .env, and that the password has no unencoded special characters."
    : (err.message || "Internal server error");
  const body = { success: false, message };
  if (req.requestId) body.requestId = req.requestId;
  res.status(500).json(body);
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
  "/api/assignments",
  "/api/timesheets",
];

const startServer = async () => {
  await connectDB();
  app.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info({ mountedRoutes: ROUTE_PREFIXES }, "Mounted route prefixes");
    const resendSet = Boolean(process.env.RESEND_API_KEY);
    const emailDisabled = process.env.EMAIL_DISABLED === "true" || process.env.EMAIL_DISABLED === "1";
    if (!resendSet) {
      logger.warn("Email: RESEND_API_KEY not set – newsletter, password reset, contact form emails will not be sent. Add to .env from https://resend.com/api-keys");
    } else if (emailDisabled) {
      logger.info("Email: disabled (EMAIL_DISABLED=true)");
    } else {
      const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "onboarding@resend.dev";
      logger.info({ from }, "Email: ready");
      if (from === "onboarding@resend.dev") {
        logger.warn("Email: Using Resend sandbox – you can only send TO delivered@resend.dev (or other @resend.dev test addresses). Verify your domain at https://resend.com/domains to send to real emails.");
      }
    }
    try {
      const { startJobs } = require("./jobs");
      await startJobs();
    } catch (err) {
      logger.warn({ err: err.message }, "Background jobs not started");
    }
  });
};

startServer();
