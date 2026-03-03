const rateLimit = require("express-rate-limit");

/** Handler to return 429 with requestId and helpful message */
function handleLimitExceeded(req, res, next, options) {
  const payload = { success: false, message: options.message || "Too many attempts. Please try again in a few minutes." };
  if (req.requestId) payload.requestId = req.requestId;
  res.status(429).json(payload);
}

/** Login: gentle per-IP throttling. 15 attempts per 15 min to avoid blocking real users with typos. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please try again in a few minutes.",
  handler: (req, res, next, options) => handleLimitExceeded(req, res, next, { message: options.message }),
});

/** Password reset (forgot + reset): 5 attempts per 15 min per IP. */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again in a few minutes.",
  handler: (req, res, next, options) => handleLimitExceeded(req, res, next, { message: options.message }),
});

/** @deprecated Use loginLimiter. Kept for backwards compat. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many contact attempts. Try again later." },
});

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many applications. Try again later." },
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many subscribe attempts. Try again later." },
});

const testimonialSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many review submissions. Try again in an hour." },
});

/** Client error reporting: 20 per 15 min per IP to avoid abuse. */
const clientErrorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many error reports." },
  handler: (req, res, next, options) => handleLimitExceeded(req, res, next, { message: options.message }),
});

module.exports = {
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
  contactLimiter,
  applyLimiter,
  newsletterLimiter,
  testimonialSubmitLimiter,
  clientErrorLimiter,
};
