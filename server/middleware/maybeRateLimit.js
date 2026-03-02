/**
 * Skips rate limiting when NODE_ENV === "test" so tests run deterministically.
 * In dev/prod, the limiter runs normally.
 */
function maybeRateLimit(limiter) {
  if (process.env.NODE_ENV === "test") {
    return (req, res, next) => next();
  }
  return limiter;
}

module.exports = { maybeRateLimit };
