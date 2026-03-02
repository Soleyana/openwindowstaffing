/**
 * Consistent cookie options for auth. Used when setting and clearing cookies.
 * Env: COOKIE_SAMESITE ("none"|"lax"|"strict"), COOKIE_SECURE (truthy for secure).
 */
const { COOKIE_SAMESITE, COOKIE_SECURE, isProduction } = require("../config/env");

const COOKIE_NAME = "authToken";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * true when cross-site cookies are needed (sameSite: "none", secure: true).
 * Set COOKIE_SAMESITE=none and COOKIE_SECURE=true for different-domain frontend/backend.
 */
function isCrossSiteCookiesEnabled() {
  const sameSite = (COOKIE_SAMESITE || "").toLowerCase();
  const secure =
    COOKIE_SECURE === "true" || COOKIE_SECURE === "1" || (isProduction && COOKIE_SECURE !== "false");
  return sameSite === "none" && secure;
}

/**
 * Options for setting the auth cookie. Same options used when clearing.
 * @param {Object} [req] - Optional request (for future per-request overrides)
 * @returns {Object} cookie options for res.cookie / res.clearCookie
 */
function getAuthCookieOptions(req) {
  const sameSite = COOKIE_SAMESITE || (isProduction ? "none" : "lax");
  const secure =
    COOKIE_SECURE === "true" ||
    COOKIE_SECURE === "1" ||
    (isProduction && COOKIE_SECURE !== "false");

  return {
    httpOnly: true,
    path: "/",
    secure: Boolean(secure),
    sameSite: sameSite,
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

/**
 * Options for clearing the cookie. Must match set options (path, httpOnly, secure, sameSite).
 */
function getClearCookieOptions(req) {
  const opts = getAuthCookieOptions(req);
  const { maxAge, ...clearOpts } = opts;
  return clearOpts;
}

module.exports = {
  COOKIE_NAME,
  COOKIE_MAX_AGE_MS,
  isCrossSiteCookiesEnabled,
  getAuthCookieOptions,
  getClearCookieOptions,
};
