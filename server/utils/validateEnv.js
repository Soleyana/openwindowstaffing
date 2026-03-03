/**
 * Production config validator. Fail-fast on startup when required env is missing or invalid.
 * In dev/test: warn only. In production: exit(1) on validation failure.
 */

function isProduction() {
  return process.env.NODE_ENV === "production";
}
const DEV_JWT_SECRET = "dev-secret-change-before-production";
const RESEND_SANDBOX_FROM = "onboarding@resend.dev";

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || "";
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function validate() {
  const errors = [];
  const warnings = [];

  if (isProduction()) {
    /* MONGODB_URI */
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || typeof mongoUri !== "string" || mongoUri.length < 10) {
      errors.push("MONGODB_URI is required in production and must be a valid connection string");
    }

    /* JWT_SECRET */
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === DEV_JWT_SECRET) {
      errors.push("JWT_SECRET must be set and must NOT be the default dev value in production");
    }

    /* CORS_ORIGINS */
    const origins = parseCorsOrigins();
    if (origins.length === 0) {
      errors.push("CORS_ORIGINS must be a non-empty comma-separated allowlist in production");
    } else if (origins.some((o) => o === "*" || o.includes("*"))) {
      errors.push("CORS_ORIGINS must not contain wildcard '*' in production");
    }

    /* Cookie config for cross-site */
    const sameSite = (process.env.COOKIE_SAMESITE || process.env.COOKIE_SAME_SITE || "none").toLowerCase();
    const secure = process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1";
    if (sameSite === "none" && !secure) {
      errors.push("When COOKIE_SAMESITE=none (cross-site), COOKIE_SECURE must be true");
    }

    /* Email config when emails enabled */
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    if (hasResend) {
      const from = process.env.EMAIL_FROM || process.env.FROM_EMAIL;
      if (!from) {
        errors.push("EMAIL_FROM (or FROM_EMAIL) is required when RESEND_API_KEY is set");
      } else if (from === RESEND_SANDBOX_FROM) {
        warnings.push("EMAIL_FROM is Resend sandbox; use a verified domain for production deliverability");
      }
    }
  } else {
    /* Dev: optional validation, warnings only */
    if (!process.env.MONGODB_URI) {
      warnings.push("MONGODB_URI not set; DB connection will fail");
    }
    if (process.env.JWT_SECRET === DEV_JWT_SECRET || !process.env.JWT_SECRET) {
      warnings.push("Using default JWT_SECRET; set a strong secret before deploying to production");
    }
    const origins = parseCorsOrigins();
    if (origins.length === 0 && !process.env.CORS_ORIGINS) {
      warnings.push("CORS_ORIGINS not set; using dev defaults");
    } else if (origins.some((o) => o === "*")) {
      warnings.push("CORS_ORIGINS contains wildcard; avoid in production");
    }
  }

  return { errors, warnings };
}

function printStartupBanner(logger) {
  const mongoSet = Boolean(process.env.MONGODB_URI);
  const origins = parseCorsOrigins();
  const corsSummary = origins.length > 0
    ? `${origins.length} origin(s) configured`
    : "using defaults";
  const envLabel = isProduction() ? "production" : "development";

  logger.info({
    env: envLabel,
    port: process.env.PORT || 5000,
    mongoConfigured: mongoSet,
    corsOrigins: corsSummary,
    jwtSecretSet: Boolean(process.env.JWT_SECRET) && process.env.JWT_SECRET !== DEV_JWT_SECRET,
  }, "Open Window Staffing – config validated");
}

/**
 * Validate env and optionally exit on failure.
 * Call this at startup before connectDB.
 * @param {Object} [opts] - { logger?: pino logger }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateEnv(opts = {}) {
  const logger = opts.logger || require("./logger");
  const { errors, warnings } = validate();

  for (const w of warnings) {
    logger.warn({ message: w }, "Env validation warning");
  }

  if (errors.length > 0) {
    for (const e of errors) {
      logger.error({ message: e }, "Env validation failed");
    }
    if (isProduction()) {
      logger.error("Production config invalid. Fix required env and restart. Exiting.");
      process.exit(1);
    }
  } else {
    printStartupBanner(logger);
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = {
  validate,
  validateEnv,
  parseCorsOrigins,
  DEV_JWT_SECRET,
};
