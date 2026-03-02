const complianceService = require("../services/complianceService");
const candidateService = require("../services/candidateService");
const ComplianceReview = require("../models/ComplianceReview");
const activityLogService = require("../services/activityLogService");
const { ROLES } = require("../constants/roles");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/candidates/me/compliance - Applicant's own compliance.
 * GET /api/candidates/:candidateId/compliance?companyId= - Recruiter with company access.
 */
exports.getCompliance = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const companyId = req.query.companyId;
    const isMe = candidateId === "me";

    if (req.user.role === ROLES.APPLICANT) {
      if (!isMe) {
        return res.status(403).json({ success: false, message: "Applicants can only view their own compliance" });
      }
      const result = await complianceService.computeCompliance(req.user._id, null);
      return res.status(200).json({ success: true, data: result });
    }

    if (!isMe && (req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER)) {
      const candidateIds = await candidateService.getAccessibleCandidateIds(req.user);
      if (!candidateIds.includes(candidateId)) {
        return res.status(403).json({ success: false, message: "Access denied to this candidate" });
      }
      if (!companyId) {
        return res.status(400).json({ success: false, message: "companyId query param is required for recruiter view" });
      }
      const { hasCompanyAccess } = require("../services/companyAccessService");
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Access denied to this company" });
      }
      const result = await complianceService.computeCompliance(candidateId, companyId);
      return res.status(200).json({ success: true, data: result });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch compliance"),
    });
  }
};

/**
 * POST /api/candidates/:candidateId/compliance/review
 * Body: { note?, companyId? }
 * Recruiter/Owner only; requires company access.
 */
exports.reviewCompliance = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { note, companyId } = req.body;

    const companyIdResolved = companyId || req.query.companyId || req.companyIdResolved;
    if (!companyIdResolved) {
      return res.status(400).json({ success: false, message: "companyId is required" });
    }

    const { hasCompanyAccess } = require("../services/companyAccessService");
    const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyIdResolved);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const candidateIds = await candidateService.getAccessibleCandidateIds(req.user);
    if (!candidateIds.includes(candidateId)) {
      return res.status(403).json({ success: false, message: "Access denied to this candidate" });
    }

    const review = await ComplianceReview.create({
      candidateId,
      companyId: companyIdResolved,
      reviewedBy: req.user._id,
      note: note || undefined,
    });

    await activityLogService.logFromReq(req, {
      companyId: companyIdResolved,
      targetType: "Candidate",
      targetId: candidateId,
      actionType: "updated",
      message: "Compliance reviewed",
      metadata: { note: note || "", reviewId: review._id.toString() },
    });

    res.status(200).json({
      success: true,
      data: { ok: true, reviewedAt: review.reviewedAt, requestId: req.requestId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to record review"),
    });
  }
};

/**
 * GET /api/recruiter/compliance?companyId=...&candidateIds=id1,id2,id3
 * Returns { candidateId: { status, missing?, expiringSoon? } }
 */
exports.getComplianceBatch = async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const candidateIdsRaw = req.query.candidateIds;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId is required" });
    }
    if (!candidateIdsRaw) {
      return res.status(200).json({ success: true, data: {} });
    }

    const candidateIds = String(candidateIdsRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { hasCompanyAccess } = require("../services/companyAccessService");
    const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const accessibleIds = await candidateService.getAccessibleCandidateIds(req.user);
    const filtered = candidateIds.filter((id) => accessibleIds.includes(id));

    const results = await complianceService.computeComplianceBatch(filtered, companyId);

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch compliance"),
    });
  }
};
