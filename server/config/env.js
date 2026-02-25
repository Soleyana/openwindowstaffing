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

module.exports = {
  isProduction,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PORT,
  MONGODB_URI,
  CLIENT_URL,
  CORS_ORIGINS,
  DEFAULT_COMPANY,
};
