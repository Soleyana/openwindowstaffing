const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const { ROLES, STAFF_ROLES, isOwner, canInviteRecruiter } = require("../constants/roles");

const COOKIE_NAME = "authToken";

/**
 * requireAuth - Verifies JWT from cookie or Authorization header.
 * Attaches req.user. Rejects if invalid/expired.
 */
exports.requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Please log in again.",
    });
  }
};

/** @deprecated Use requireAuth */
exports.protect = exports.requireAuth;

/**
 * requireRole(...roles) - Restricts access to specified roles.
 * Must be used after requireAuth.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
}

/** Staff only: recruiter or owner */
exports.requireStaff = requireRole(...STAFF_ROLES);

/** Recruiter or owner - for recruiter dashboard, job posting */
exports.requireRecruiter = requireRole(ROLES.RECRUITER, ROLES.OWNER);

/** Owner only - for invite management */
exports.requireOwner = requireRole(ROLES.OWNER);

/** Applicant only - for job applications */
exports.requireApplicant = requireRole(ROLES.APPLICANT);

exports.requireRole = requireRole;
