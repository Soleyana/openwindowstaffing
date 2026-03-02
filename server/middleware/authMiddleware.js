const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config/env");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { hasCompanyAccess, resolveCompanyIdFromEntity } = require("../services/companyAccessService");
const { COOKIE_NAME } = require("../utils/cookieOptions");

/**
 * optionalAuth - Tries to verify JWT from cookie or Authorization header.
 * Attaches req.user if valid. Does NOT reject if missing/invalid.
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email role");
    if (user) req.user = user;
  } catch {
    /* ignore */
  }
  next();
};

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

/**
 * requireCompanyAccess - Ensures user has access to the given company.
 * Must be used after requireAuth and requireRecruiter/requireOwner.
 * Expects companyId from req.params.companyId, req.query.companyId, or req.body.companyId.
 * Attaches req.company and req.membership when applicable.
 */
exports.requireCompanyAccess = (companyIdSource = "params") => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    let companyId = req.params.companyId || req.query.companyId || req.body?.companyId;
    if (companyIdSource === "params" && req.params.companyId) companyId = req.params.companyId;
    if (companyIdSource === "query" && req.query.companyId) companyId = req.query.companyId;
    if (companyIdSource === "body" && req.body?.companyId) companyId = req.body.companyId;

    if (!companyId) {
      companyId = await resolveCompanyIdFromEntity({
        jobId: req.params.jobId,
        applicationId: req.params.applicationId || req.params.id,
        threadId: req.params.threadId,
        facilityId: req.params.facilityId,
      });
    }
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required.",
      });
    }

    const { allowed, company, membership } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed || !company) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have access to this company.",
      });
    }

    req.company = company;
    req.membership = membership;
    req.companyIdResolved = companyId;
    next();
  };
};

/**
 * requireCompanyOwnerOrAdmin - Must be used after requireCompanyAccess.
 * Restricts to company owner (Company.ownerId) or membership role admin/owner.
 */
exports.requireCompanyOwnerOrAdmin = (req, res, next) => {
  if (!req.company) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  const userId = req.user._id.toString();
  const isOwner = req.company.ownerId?.toString() === userId;
  const isAdmin = req.membership && ["owner", "admin"].includes(req.membership.role);
  if (isOwner || isAdmin) return next();
  return res.status(403).json({
    success: false,
    message: "Only company owner or admin can perform this action.",
  });
};
