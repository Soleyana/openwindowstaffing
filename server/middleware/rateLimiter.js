const rateLimit = require("express-rate-limit");

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

module.exports = {
  authLimiter,
  contactLimiter,
  applyLimiter,
  newsletterLimiter,
  testimonialSubmitLimiter,
};
