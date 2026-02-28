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
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5176"];

const DEFAULT_COMPANY = process.env.DEFAULT_COMPANY || "Open Window Staffing";

const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
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

module.exports = {
  isProduction,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PORT,
  MONGODB_URI,
  CLIENT_URL,
  CORS_ORIGINS,
  DEFAULT_COMPANY,
  PASSWORD_MIN_LENGTH,
  RESEND_API_KEY,
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
};
