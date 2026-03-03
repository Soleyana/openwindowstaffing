/**
 * Assignment (Placement) controller.
 * Multi-tenant: recruiters/owners scoped by company; applicants only own assignments.
 */
const Assignment = require("../models/Assignment");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const notificationService = require("../services/notificationService");
const emailService = require("../services/emailService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { ASSIGNMENT_STATUSES } = require("../models/Assignment");

/** Get ObjectId string from ref (works for both raw ObjectId and populated doc). */
function toIdString(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

const ALLOWED_TRANSITIONS = {
  drafted: ["offered", "cancelled"],
  offered: ["drafted", "accepted", "cancelled"],
  accepted: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed && allowed.includes(to);
}

async function ensureCompanyAccess(user, companyId) {
  const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
  if (!allowed) return false;
  return true;
}

async function ensureAssignmentAccess(user, assignment) {
  const assignmentId = assignment._id.toString();
  const companyId = toIdString(assignment.companyId);

  if (STAFF_ROLES.includes(user.role)) {
    const hasAccess = await ensureCompanyAccess(user, companyId);
    return hasAccess;
  }
  if (user.role === ROLES.APPLICANT) {
    return assignment.candidateId?.toString() === user._id.toString();
  }
  return false;
}

/**
 * POST /api/assignments - Create assignment from application (recruiter/owner).
 */
exports.createAssignment = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { applicationId, facilityId, startDate, endDate, payRate, shiftInfo } = req.body;

    const app = await Application.findById(applicationId)
      .populate("jobId", "companyId facilityId createdBy")
      .lean();
    if (!app) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const companyId = app.companyId?.toString() || app.jobId?.companyId?.toString();
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Application has no company" });
    }

    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const candidateId = (app.applicant?._id || app.applicant)?.toString?.() || app.applicant;
    if (!candidateId) {
      return res.status(400).json({ success: false, message: "Application has no applicant" });
    }

    const existing = await Assignment.findOne({
      applicationId,
      status: { $in: ["drafted", "offered", "accepted", "active"] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An active assignment already exists for this application",
      });
    }

    const payRateObj = payRate && typeof payRate === "object"
      ? {
          billRate: payRate.billRate,
          payRate: payRate.payRate,
          currency: payRate.currency || "USD",
          unit: ["hour", "shift"].includes(payRate.unit) ? payRate.unit : "hour",
        }
      : undefined;

    const shiftInfoObj = shiftInfo && typeof shiftInfo === "object"
      ? {
          type: shiftInfo.type,
          hoursPerWeek: shiftInfo.hoursPerWeek,
          scheduleNotes: shiftInfo.scheduleNotes,
        }
      : undefined;

    const assignment = await Assignment.create({
      companyId,
      facilityId: facilityId || app.facilityId || app.jobId?.facilityId,
      jobId: app.jobId?._id || app.jobId,
      applicationId,
      candidateId,
      recruiterId: req.user._id,
      status: "drafted",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      payRate: payRateObj,
      shiftInfo: shiftInfoObj,
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Assignment",
      targetId: assignment._id.toString(),
      actionType: "assignment_created",
      message: `Assignment created by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId, applicationId, jobId: assignment.jobId?.toString() },
    });

    const populated = await Assignment.findById(assignment._id)
      .populate("jobId", "title")
      .populate("candidateId", "name email")
      .lean();

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create assignment"),
    });
  }
};

/**
 * GET /api/assignments - List assignments (recruiter/owner, company-scoped).
 */
exports.listAssignments = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { companyId, status, candidateId, jobId } = req.query;

    let companyIds = [];
    if (companyId) {
      const hasAccess = await ensureCompanyAccess(req.user, companyId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Access denied to this company" });
      }
      companyIds = [companyId];
    } else {
      companyIds = await getAccessibleCompanyIds(req.user._id.toString());
      if (companyIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const query = { companyId: { $in: companyIds } };
    if (status && ASSIGNMENT_STATUSES.includes(status)) query.status = status;
    if (candidateId) query.candidateId = candidateId;
    if (jobId) query.jobId = jobId;

    const assignments = await Assignment.find(query)
      .populate("jobId", "title company location")
      .populate("candidateId", "name email")
      .populate("applicationId", "status")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch assignments"),
    });
  }
};

/**
 * GET /api/assignments/me - Applicant's own assignments.
 */
exports.getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const assignments = await Assignment.find({ candidateId: req.user._id })
      .populate("jobId", "title company location")
      .populate("companyId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch assignments"),
    });
  }
};

/**
 * GET /api/assignments/:id - Get single assignment (scoped).
 */
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("jobId", "title company location")
      .populate("candidateId", "name email")
      .populate("applicationId", "status")
      .populate("companyId", "name")
      .lean();

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const hasAccess = await ensureAssignmentAccess(req.user, assignment);
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    return res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch assignment"),
    });
  }
};

/**
 * PATCH /api/assignments/:id - Update assignment (status transitions + fields).
 */
exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const hasAccess = await ensureAssignmentAccess(req.user, assignment);
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only recruiters/owners can update" });
    }

    const { status, startDate, endDate, payRate, shiftInfo } = req.body;
    const companyId = toIdString(assignment.companyId);

    if (status && status !== assignment.status) {
      if (!canTransition(assignment.status, status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${assignment.status} to ${status}`,
        });
      }
      assignment.status = status;
      if (status === "active") {
        assignment.acceptedAt = assignment.acceptedAt || new Date();
      }
    }

    if (startDate !== undefined) assignment.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) assignment.endDate = endDate ? new Date(endDate) : null;
    if (payRate && typeof payRate === "object") {
      assignment.payRate = {
        billRate: payRate.billRate,
        payRate: payRate.payRate,
        currency: payRate.currency || "USD",
        unit: ["hour", "shift"].includes(payRate.unit) ? payRate.unit : "hour",
      };
    }
    if (shiftInfo && typeof shiftInfo === "object") {
      assignment.shiftInfo = {
        type: shiftInfo.type,
        hoursPerWeek: shiftInfo.hoursPerWeek,
        scheduleNotes: shiftInfo.scheduleNotes,
      };
    }

    assignment.updatedAt = new Date();
    await assignment.save();

    const actionMap = {
      completed: "assignment_completed",
      cancelled: "assignment_cancelled",
      active: "assignment_activated",
    };
    const actionType = actionMap[assignment.status];
    if (actionType) {
      await activityLogService.logFromReq(req, {
        companyId,
        targetType: "Assignment",
        targetId: assignment._id.toString(),
        actionType,
        message: `Assignment ${assignment.status} by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
        metadata: { candidateId: assignment.candidateId?.toString() },
      });
    }

    const populated = await Assignment.findById(assignment._id)
      .populate("jobId", "title")
      .populate("candidateId", "name email")
      .lean();

    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update assignment"),
    });
  }
};

/**
 * POST /api/assignments/:id/offer - Send offer to candidate.
 */
exports.offerAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("jobId", "title")
      .populate("candidateId", "name email")
      .populate("companyId", "name");
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    const hasAccess = await ensureAssignmentAccess(req.user, assignment);
    if (!hasAccess || !STAFF_ROLES.includes(req.user.role)) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (assignment.status !== "drafted") {
      return res.status(400).json({
        success: false,
        message: `Cannot offer: assignment is ${assignment.status}`,
      });
    }

    assignment.status = "offered";
    assignment.offeredAt = new Date();
    assignment.updatedAt = new Date();
    await assignment.save();

    const companyId = toIdString(assignment.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Assignment",
      targetId: assignment._id.toString(),
      actionType: "assignment_offered",
      message: `Assignment offered by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId: assignment.candidateId?._id?.toString() || assignment.candidateId?.toString() },
    });

    const candidateEmail = assignment.candidateId?.email || assignment.candidateId;
    const candidateName = assignment.candidateId?.name || [assignment.candidateId?.firstName, assignment.candidateId?.lastName].filter(Boolean).join(" ") || "there";
    const jobTitle = assignment.jobId?.title || "the position";
    if (candidateEmail && typeof candidateEmail === "string") {
      emailService.sendAssignmentOffer(candidateEmail, candidateName, jobTitle, assignment._id.toString()).catch(() => {});
    }

    const populated = await Assignment.findById(assignment._id)
      .populate("jobId", "title")
      .populate("candidateId", "name email")
      .lean();

    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to send offer"),
    });
  }
};

/**
 * POST /api/assignments/:id/accept - Applicant accepts offer.
 */
exports.acceptAssignment = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const assignment = await Assignment.findById(req.params.id)
      .populate("jobId", "title")
      .lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (assignment.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (assignment.status !== "offered") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept: assignment is ${assignment.status}`,
      });
    }

    const now = new Date();
    const startDate = assignment.startDate ? new Date(assignment.startDate) : null;
    const newStatus = startDate && startDate <= now ? "active" : "accepted";

    await Assignment.findByIdAndUpdate(req.params.id, {
      status: newStatus,
      acceptedAt: now,
      updatedAt: now,
    });

    const companyId = toIdString(assignment.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Assignment",
      targetId: assignment._id.toString(),
      actionType: "assignment_accepted",
      message: `Assignment accepted by ${(req.user.name || req.user.email || "Applicant").toString().trim()}`,
      metadata: { candidateId: req.user._id.toString(), jobId: assignment.jobId?.toString() },
    });

    const assign = await Assignment.findById(req.params.id).populate("recruiterId", "name").populate("jobId", "title").lean();
    const jobTitle = assign?.jobId?.title || assignment.jobId?.title || "a role";
    const candidateName = (req.user.name || req.user.email || "Candidate").toString().trim();
    if (assign?.recruiterId?._id) {
      await notificationService.create({
        userId: assign.recruiterId._id,
        companyId,
        type: "assignment_accepted",
        title: "Assignment accepted",
        body: `${candidateName} accepted the offer for ${jobTitle}.`,
        url: "/applicant-pipeline",
      });
    }

    const updated = await Assignment.findById(req.params.id)
      .populate("jobId", "title")
      .populate("candidateId", "name email")
      .lean();

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to accept assignment"),
    });
  }
};
