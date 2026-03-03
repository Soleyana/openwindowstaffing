const Assignment = require("../models/Assignment");
const applicationService = require("../services/applicationService");
const { getAccessibleCompanyIds } = require("../services/companyAccessService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const activityLogService = require("../services/activityLogService");

exports.getAllApplications = async (req, res) => {
  try {
    const result = await applicationService.getApplicationsGrouped(req.user);
    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    const allApps = result.applications || Object.values(result.byStatus || {}).flat();
    const candidateIds = [...new Set(allApps.map((a) => (a.applicant?._id || a.applicant)?.toString?.()).filter(Boolean))];

    let activeCandidateIds = new Set();
    if (companyIds.length > 0 && candidateIds.length > 0) {
      const active = await Assignment.find({
        candidateId: { $in: candidateIds },
        companyId: { $in: companyIds },
        status: { $in: ["accepted", "active"] },
      }).select("candidateId").lean();
      active.forEach((a) => activeCandidateIds.add(a.candidateId?.toString()));
    }

    const addFlag = (app) => ({
      ...app,
      hasActiveAssignment: activeCandidateIds.has((app.applicant?._id || app.applicant)?.toString?.()),
    });

    const byStatus = {};
    Object.keys(result.byStatus || {}).forEach((s) => {
      byStatus[s] = (result.byStatus[s] || []).map(addFlag);
    });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        byStatus,
        applications: (result.applications || []).map(addFlag),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch applications"),
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const app = await applicationService.updateStatus(req.user, id, status, note);

    await activityLogService.logFromReq(req, {
      targetType: "Application",
      targetId: id,
      actionType: "status_changed",
      message: `Status changed to ${status}`,
      metadata: { newStatus: status },
    });

    res.status(200).json({
      success: true,
      message: "Status updated",
      data: app,
    });
  } catch (error) {
    if (error.message === "Invalid status") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === "Application not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Not authorized") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update status"),
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const app = await applicationService.addNote(req.user, id, text);

    res.status(201).json({
      success: true,
      message: "Note added",
      data: app,
    });
  } catch (error) {
    if (error.message === "Application not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Not authorized") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to add note"),
    });
  }
};

exports.getApplicantsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const applications = await applicationService.getApplicantsForJob(req.user, jobId);

    if (applications === null) {
      return res.status(404).json({
        success: false,
        message: "Job not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch applicants"),
    });
  }
};
