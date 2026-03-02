const SavedJob = require("../models/SavedJob");
const Job = require("../models/Job");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/saved-jobs - List user's saved jobs.
 */
exports.getSavedJobs = async (req, res) => {
  try {
    const saved = await SavedJob.find({ userId: req.user._id })
      .populate("jobId")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const jobs = saved
      .filter((s) => s.jobId && (!s.jobId.expiresAt || s.jobId.expiresAt > now))
      .map((s) => ({ ...s.jobId, savedAt: s.createdAt }));

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch saved jobs"),
    });
  }
};

/**
 * POST /api/saved-jobs - Save a job.
 */
exports.saveJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, message: "jobId is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const existing = await SavedJob.findOne({ userId: req.user._id, jobId });
    if (existing) {
      return res.status(200).json({ success: true, data: existing, message: "Already saved" });
    }

    const saved = await SavedJob.create({ userId: req.user._id, jobId });
    res.status(201).json({ success: true, data: saved.toObject() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to save job"),
    });
  }
};

/**
 * GET /api/saved-jobs/check/:jobId - Check if job is saved.
 */
exports.checkSaved = async (req, res) => {
  try {
    const { jobId } = req.params;
    const saved = await SavedJob.findOne({ userId: req.user._id, jobId });
    res.status(200).json({ success: true, saved: !!saved });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to check"),
    });
  }
};

/**
 * GET /api/saved-jobs/check/:jobId - Check if job is saved.
 */
exports.checkSaved = async (req, res) => {
  try {
    const { jobId } = req.params;
    const saved = await SavedJob.findOne({ userId: req.user._id, jobId });
    res.status(200).json({ success: true, saved: !!saved });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to check saved status"),
    });
  }
};

/**
 * DELETE /api/saved-jobs/:jobId - Unsave a job.
 */
exports.unsaveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    await SavedJob.findOneAndDelete({ userId: req.user._id, jobId });
    res.status(200).json({ success: true, message: "Removed from saved" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to remove saved job"),
    });
  }
};
