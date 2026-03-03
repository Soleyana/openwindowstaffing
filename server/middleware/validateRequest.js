/**
 * Request validation middleware using Zod.
 * Returns consistent 400 with { success: false, message, errors?, requestId }.
 */
const { z } = require("zod");

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      return next();
    }
    const err = result.error;
    const issues = err.issues || err.errors || [];
    const first = issues[0];
    const message = (first?.message || first?.msg) || "Validation failed";
    const errors = issues.map((e) => ({ path: (e.path || []).join?.("."), message: e.message || e.msg }));
    const payload = { success: false, message, errors };
    if (req.requestId) payload.requestId = req.requestId;
    return res.status(400).json(payload);
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (result.success) {
      req.query = result.data;
      return next();
    }
    const err = result.error;
    const issues = err.issues || err.errors || [];
    const first = issues[0];
    const message = (first?.message || first?.msg) || "Validation failed";
    const errors = issues.map((e) => ({ path: (e.path || []).join?.("."), message: e.message || e.msg }));
    const payload = { success: false, message, errors };
    if (req.requestId) payload.requestId = req.requestId;
    return res.status(400).json(payload);
  };
}

module.exports = { validateBody, validateQuery };
