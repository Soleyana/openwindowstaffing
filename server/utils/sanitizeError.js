/**
 * Sanitize error messages before sending to client.
 * Prevents raw MongoDB/database errors (e.g. "bad auth : authentication failed") from being exposed.
 */
function sanitizeErrorMessage(err, fallback = "Something went wrong") {
  const raw = (err?.message || "").toLowerCase();
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
