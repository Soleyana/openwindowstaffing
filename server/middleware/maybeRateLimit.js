/**
 * Skips rate limiting when NODE_ENV is test/development, or RATE_LIMIT_DISABLED is set.
 * Ensures no 429 in local dev unless RATE_LIMIT_ENABLED=1 explicitly enables it.
 * In production, RATE_LIMIT_DISABLED should never be set.
 */
function shouldSkipRateLimit() {
  if (process.env.RATE_LIMIT_ENABLED === "true" || process.env.RATE_LIMIT_ENABLED === "1") {
    return false;
  }
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development" ||
    process.env.RATE_LIMIT_DISABLED === "true" ||
    process.env.RATE_LIMIT_DISABLED === "1"
  );
}

function maybeRateLimit(limiter, route = "") {
  if (shouldSkipRateLimit()) {
    const reason = process.env.NODE_ENV === "test" ? "NODE_ENV=test" : process.env.NODE_ENV === "development" ? "NODE_ENV=development" : "RATE_LIMIT_DISABLED";
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rateLimit] skipped", { route, reason });
    }
    return (req, res, next) => next();
  }
  return limiter;
}

module.exports = { maybeRateLimit };
