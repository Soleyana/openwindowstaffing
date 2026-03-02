const { randomUUID } = require("crypto");

/**
 * Attach a unique requestId to each request for tracing.
 */
function requestIdMiddleware(req, res, next) {
  req.requestId = req.get("x-request-id") || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

module.exports = requestIdMiddleware;
