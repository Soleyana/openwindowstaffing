/**
 * Centralized environment config. Fails fast in production when secrets are missing.
 */
const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name) {
  const value = process.env[name];
  if (isProduction && !value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in .env or your deployment config.`);
  }
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET") || "dev-secret-change-before-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL;
/** Production base URL for email links when CLIENT_URL not set. No localhost in production. */
const PRODUCTION_BASE_URL = "https://openwindowstaffing.com";
const getClientUrl = () => CLIENT_URL || (isProduction ? PRODUCTION_BASE_URL : "http://localhost:5173");
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5176"];
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
const COOKIE_SECURE = process.env.COOKIE_SECURE;

const DEFAULT_COMPANY = process.env.DEFAULT_COMPANY || "Open Window Staffing";

const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "onboarding@resend.dev";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.CONTACT_EMAIL;
const FROM_EMAIL = EMAIL_FROM; // backward compat
const COMPANY_NAME = process.env.DEFAULT_COMPANY || "Open Window Staffing";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.FROM_EMAIL;

/* Storage (S3/R2). When set, resumes upload to cloud instead of local disk. */
const STORAGE_BUCKET = process.env.STORAGE_BUCKET;
const STORAGE_REGION = process.env.STORAGE_REGION || "auto";
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY;
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const STORAGE_PUBLIC_URL_BASE = process.env.STORAGE_PUBLIC_URL_BASE;
const STORAGE_PREFIX = process.env.STORAGE_PREFIX || "resumes";

/** Rate limiting: set to true or 1 in local .env only to disable during dev. Never set in production. */
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === "true" || process.env.RATE_LIMIT_DISABLED === "1";

/** Safe mode toggles: prevent outbound emails (incident response). */
const EMAIL_DISABLED = process.env.EMAIL_DISABLED === "true" || process.env.EMAIL_DISABLED === "1";

/** Testing only: redirect all outgoing emails to this address. Disabled by default. */
const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE || null;

/* Document upload limits: 10MB resume (apply), 15MB credentials (profile docs) */
const MAX_RESUME_SIZE_MB = parseInt(process.env.MAX_RESUME_SIZE_MB, 10) || 10;
const MAX_CREDENTIAL_SIZE_MB = parseInt(process.env.MAX_CREDENTIAL_SIZE_MB, 10) || 15;
const MAX_UPLOAD_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || MAX_CREDENTIAL_SIZE_MB; /* backward compat */
const ALLOWED_DOCUMENT_MIMES = (process.env.ALLOWED_DOCUMENT_MIMES || "application/pdf,image/jpeg,image/png").split(",").map((m) => m.trim()).filter(Boolean);

module.exports = {
  isProduction,
  RATE_LIMIT_DISABLED,
  EMAIL_DISABLED,
  TEST_EMAIL_OVERRIDE,
  PRODUCTION_BASE_URL,
  getClientUrl,
  JWT_SECRET,
  COOKIE_SAMESITE,
  COOKIE_SECURE,
  COOKIE_SAME_SITE: COOKIE_SAMESITE, // backward compat
  JWT_EXPIRES_IN,
  PORT,
  MONGODB_URI,
  CLIENT_URL,
  CORS_ORIGINS,
  DEFAULT_COMPANY,
  PASSWORD_MIN_LENGTH,
  RESEND_API_KEY,
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  FROM_EMAIL,
  COMPANY_NAME,
  CONTACT_EMAIL,
  STORAGE_BUCKET,
  STORAGE_REGION,
  STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY,
  STORAGE_ENDPOINT,
  STORAGE_PUBLIC_URL_BASE,
  STORAGE_PREFIX,
  MAX_RESUME_SIZE_MB,
  MAX_CREDENTIAL_SIZE_MB,
  MAX_UPLOAD_SIZE_MB,
  ALLOWED_DOCUMENT_MIMES,
};
