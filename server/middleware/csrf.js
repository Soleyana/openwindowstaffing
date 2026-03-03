/**
 * CSRF protection (double-submit cookie) for state-changing routes.
 * Safe methods (GET/HEAD/OPTIONS) bypass; POST/PATCH/PUT/DELETE require
 * X-CSRF-Token header to match csrf-token cookie.
 */
const crypto = require("crypto");
const { COOKIE_SAMESITE, COOKIE_SECURE, isProduction } = require("../config/env");

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getCsrfCookieOptions() {
  const secure =
    COOKIE_SECURE === "true" ||
    COOKIE_SECURE === "1" ||
    (isProduction && COOKIE_SECURE !== "false");
  const sameSite = COOKIE_SAMESITE || (isProduction ? "none" : "lax");
  return {
    httpOnly: false,
    path: "/",
    sameSite: sameSite,
    secure: Boolean(secure),
    maxAge: 60 * 60 * 1000,
  };
}

function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.includes(req.method)) return next();
  if ((req.path || req.url || "").includes("/client-errors")) return next(); /* exempt: error reporting */

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token",
      requestId: req.requestId,
    });
  }
  next();
}

module.exports = {
  csrfMiddleware,
  generateToken,
  getCsrfCookieOptions,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
