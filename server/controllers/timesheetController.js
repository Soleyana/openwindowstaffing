/**
 * Timesheet controller.
 * Applicant: create, edit draft, submit. Recruiter/owner: approve, reject, list.
 */
const Timesheet = require("../models/Timesheet");
const Assignment = require("../models/Assignment");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const notificationService = require("../services/notificationService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { TIMESHEET_STATUSES } = require("../models/Timesheet");

function toIdString(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

function computeTotalHours(entries) {
  if (!entries || !Array.isArray(entries)) return 0;
  return entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
}

async function ensureCompanyAccess(user, companyId) {
  const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
  return !!allowed;
}

/**
 * POST /api/timesheets - Applicant creates timesheet for their assignment.
 */
exports.createTimesheet = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const { assignmentId, periodStart, periodEnd, entries } = req.body;
    if (!assignmentId || !periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: "assignmentId, periodStart, periodEnd required" });
    }

    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }
    if (assignment.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Assignment does not belong to you" });
    }
    if (!["accepted", "active"].includes(assignment.status)) {
      return res.status(400).json({ success: false, message: "Assignment must be accepted or active" });
    }

    const companyId = toIdString(assignment.companyId);
    const facilityId = assignment.facilityId || undefined;
    const jobId = assignment.jobId || undefined;
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);

    const normalizedEntries = Array.isArray(entries)
      ? entries.map((e) => ({
          date: e.date ? new Date(e.date) : null,
          hours: Number(e.hours) || 0,
          notes: e.notes || undefined,
        })).filter((e) => e.date && !isNaN(e.hours))
      : [];

    const existing = await Timesheet.findOne({
      companyId,
      assignmentId,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
    });
    if (existing) {
      const doc = existing.toObject ? existing.toObject() : existing;
      doc.totalHours = computeTotalHours(existing.entries);
      return res.status(200).json({ success: true, data: doc });
    }

    try {
      const timesheet = await Timesheet.create({
        companyId,
        assignmentId,
        candidateId: req.user._id,
        facilityId,
        jobId,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        entries: normalizedEntries,
        status: "draft",
      });

      const totalHours = computeTotalHours(timesheet.entries);
      await activityLogService.logFromReq(req, {
        companyId,
        targetType: "Timesheet",
        targetId: timesheet._id.toString(),
        actionType: "timesheet_created",
        message: `Timesheet created by ${(req.user.name || req.user.email || "Applicant").toString().trim()}`,
        metadata: { assignmentId, candidateId: req.user._id.toString(), totalHours },
      });

      const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
      doc.totalHours = totalHours;
      return res.status(201).json({ success: true, data: doc });
    } catch (createError) {
      if (createError.code === 11000) {
        const fallback = await Timesheet.findOne({
          companyId,
          assignmentId,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
        });
        if (fallback) {
          const doc = fallback.toObject ? fallback.toObject() : fallback;
          doc.totalHours = computeTotalHours(fallback.entries);
          const payload = { success: true, data: doc };
          if (req.requestId) payload.requestId = req.requestId;
          return res.status(200).json(payload);
        }
      }
      throw createError;
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create timesheet"),
    });
  }
};

/**
 * GET /api/timesheets/me - Applicant's own timesheets.
 */
exports.getMyTimesheets = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const { status, from, to } = req.query;
    const query = { candidateId: req.user._id };
    if (status && TIMESHEET_STATUSES.includes(status)) query.status = status;
    if (from) query.periodEnd = { ...query.periodEnd, $gte: new Date(from) };
    if (to) query.periodStart = { ...query.periodStart, $lte: new Date(to) };

    const timesheets = await Timesheet.find(query)
      .populate("assignmentId", "status")
      .populate("jobId", "title")
      .sort({ periodStart: -1 })
      .lean();

    const withTotals = timesheets.map((t) => {
      const total = computeTotalHours(t.entries);
      return { ...t, totalHours: total };
    });

    return res.status(200).json({ success: true, data: withTotals });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch timesheets"),
    });
  }
};

/**
 * PATCH /api/timesheets/:id - Applicant edits draft or reverts rejected to draft.
 */
exports.updateTimesheet = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    if (timesheet.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    if (!["draft", "rejected"].includes(timesheet.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit: timesheet is ${timesheet.status}`,
      });
    }

    // Revert rejected to draft if body has revertToDraft
    if (timesheet.status === "rejected" && req.body.revertToDraft) {
      timesheet.status = "draft";
      timesheet.rejectionReason = undefined;
      timesheet.updatedAt = new Date();
      await timesheet.save();
      const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
      doc.totalHours = computeTotalHours(timesheet.entries);
      return res.status(200).json({ success: true, data: doc });
    }

    if (timesheet.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Can only edit entries when draft; use revertToDraft for rejected",
      });
    }

    const { entries } = req.body;
    if (Array.isArray(entries)) {
      timesheet.entries = entries.map((e) => ({
        date: e.date ? new Date(e.date) : null,
        hours: Number(e.hours) || 0,
        notes: e.notes || undefined,
      })).filter((e) => e.date && !isNaN(e.hours));
    }
    timesheet.updatedAt = new Date();
    await timesheet.save();

    const totalHours = computeTotalHours(timesheet.entries);
    const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
    doc.totalHours = totalHours;
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update timesheet"),
    });
  }
};

/**
 * POST /api/timesheets/:id/submit - Applicant submits timesheet.
 */
exports.submitTimesheet = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    if (timesheet.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    if (timesheet.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Cannot submit: timesheet is ${timesheet.status}`,
      });
    }

    timesheet.status = "submitted";
    timesheet.submittedAt = new Date();
    timesheet.updatedAt = new Date();
    await timesheet.save();

    const companyId = toIdString(timesheet.companyId);
    const totalHours = computeTotalHours(timesheet.entries);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Timesheet",
      targetId: timesheet._id.toString(),
      actionType: "timesheet_submitted",
      message: `Timesheet submitted by ${(req.user.name || req.user.email || "Applicant").toString().trim()}`,
      metadata: { assignmentId: timesheet.assignmentId?.toString(), totalHours },
    });

    const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
    doc.totalHours = totalHours;
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to submit timesheet"),
    });
  }
};

/**
 * GET /api/timesheets - Recruiter/owner list (company-scoped).
 */
exports.listTimesheets = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { companyId, status, from, to, candidateId } = req.query;

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
    if (status && TIMESHEET_STATUSES.includes(status)) query.status = status;
    if (from) query.periodEnd = { ...query.periodEnd, $gte: new Date(from) };
    if (to) query.periodStart = { ...query.periodStart, $lte: new Date(to) };
    if (candidateId) query.candidateId = candidateId;

    const timesheets = await Timesheet.find(query)
      .populate("assignmentId", "status")
      .populate("candidateId", "name email")
      .populate("jobId", "title")
      .sort({ periodStart: -1, updatedAt: -1 })
      .lean();

    const withTotals = timesheets.map((t) => {
      const total = computeTotalHours(t.entries);
      return { ...t, totalHours: total };
    });

    return res.status(200).json({ success: true, data: withTotals });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch timesheets"),
    });
  }
};

/**
 * GET /api/timesheets/:id - Get single (scoped).
 */
exports.getTimesheet = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate("assignmentId", "status jobId")
      .populate("candidateId", "name email")
      .populate("jobId", "title")
      .lean();

    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }

    if (req.user.role === ROLES.APPLICANT) {
      if (timesheet.candidateId?._id?.toString() !== req.user._id.toString() && timesheet.candidateId?.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: "Timesheet not found" });
      }
    } else {
      const hasAccess = await ensureCompanyAccess(req.user, toIdString(timesheet.companyId));
      if (!hasAccess) return res.status(404).json({ success: false, message: "Timesheet not found" });
    }

    const totalHours = computeTotalHours(timesheet.entries);
    return res.status(200).json({ success: true, data: { ...timesheet, totalHours } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch timesheet"),
    });
  }
};

/**
 * PATCH /api/timesheets/:id/approve - Recruiter/owner approves.
 */
exports.approveTimesheet = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    const hasAccess = await ensureCompanyAccess(req.user, timesheet.companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (timesheet.status !== "submitted") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve: timesheet is ${timesheet.status}`,
      });
    }

    timesheet.status = "approved";
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = req.user._id;
    timesheet.rejectionReason = undefined;
    timesheet.updatedAt = new Date();
    await timesheet.save();

    const companyId = toIdString(timesheet.companyId);
    const totalHours = computeTotalHours(timesheet.entries);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Timesheet",
      targetId: timesheet._id.toString(),
      actionType: "timesheet_approved",
      message: `Timesheet approved by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId: timesheet.candidateId?.toString(), totalHours },
    });

    const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
    doc.totalHours = totalHours;
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to approve timesheet"),
    });
  }
};

/**
 * PATCH /api/timesheets/:id/reject - Recruiter/owner rejects (reason required).
 */
exports.rejectTimesheet = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }
    const hasAccess = await ensureCompanyAccess(req.user, timesheet.companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (timesheet.status !== "submitted") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject: timesheet is ${timesheet.status}`,
      });
    }

    const { reason } = req.body;
    const rejectionReason = typeof reason === "string" ? reason.trim() : "";
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    timesheet.status = "rejected";
    timesheet.rejectionReason = rejectionReason;
    timesheet.approvedAt = undefined;
    timesheet.approvedBy = undefined;
    timesheet.updatedAt = new Date();
    await timesheet.save();

    const companyId = toIdString(timesheet.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Timesheet",
      targetId: timesheet._id.toString(),
      actionType: "timesheet_rejected",
      message: `Timesheet rejected by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId: timesheet.candidateId?.toString(), reason: rejectionReason },
    });

    if (timesheet.candidateId) {
      await notificationService.create({
        userId: timesheet.candidateId,
        companyId: timesheet.companyId,
        type: "timesheet_rejected",
        title: "Timesheet rejected",
        body: rejectionReason || "Your timesheet was rejected. Please review and resubmit.",
        url: "/timesheets",
      });
    }

    const doc = timesheet.toObject ? timesheet.toObject() : timesheet;
    doc.totalHours = computeTotalHours(timesheet.entries);
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to reject timesheet"),
    });
  }
};
