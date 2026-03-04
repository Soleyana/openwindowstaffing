/**
 * Sanitize error messages before sending to client.
 * Prevents raw MongoDB/database errors from being exposed.
 */
function sanitizeErrorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;
  const raw = (err?.message || "").toLowerCase();
  const code = err?.code;
  if (code === 11000 || raw.includes("e11000") || raw.includes("duplicate key")) {
    return "A record with this value already exists.";
  }
  const isDbError =
    raw.includes("bad auth") ||
    raw.includes("authentication failed") ||
    raw.includes("mongo") ||
    raw.includes("econnrefused") ||
    raw.includes("econnreset");
  return isDbError
    ? "Database connection error. Check MongoDB Atlas credentials and Network Access (IP allowlist) in your .env or deployment environment."
    : (err?.message || fallback);
}

module.exports = { sanitizeErrorMessage };
