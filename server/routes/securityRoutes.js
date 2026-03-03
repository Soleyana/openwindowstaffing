/**
 * Security-related endpoints (CSRF token, etc.).
 */
const express = require("express");
const router = express.Router();
const {
  generateToken,
  getCsrfCookieOptions,
  CSRF_COOKIE_NAME,
} = require("../middleware/csrf");

router.get("/csrf", (req, res) => {
  const token = generateToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  res.json({ token });
});

module.exports = router;
