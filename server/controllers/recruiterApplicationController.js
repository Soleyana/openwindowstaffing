const applicationService = require("../services/applicationService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

exports.getAllApplications = async (req, res) => {
  try {
    const result = await applicationService.getApplicationsGrouped(req.user);
    res.status(200).json({
      success: true,
      data: result,
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
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const app = await applicationService.updateStatus(req.user, id, status);

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
