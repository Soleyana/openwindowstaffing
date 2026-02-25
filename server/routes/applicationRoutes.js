const express = require("express");
const router = express.Router();
const { requireAuth, requireApplicant, requireRecruiter } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { DEFAULT_STATUS } = require("../constants/applicationStatuses");
const {
  createApplication,
  getAllApplications,
  getMyApplications,
  getMyApplicationStats,
  getApplicationsForJob,
  checkApplied,
  updateApplicationStatus,
} = require("../controllers/applicationController");
/* Applicant routes */
router.get("/my", requireAuth, requireApplicant, getMyApplications);
router.get("/my-stats", requireAuth, requireApplicant, getMyApplicationStats);
router.get("/check/:jobId", requireAuth, requireApplicant, checkApplied);

/* Recruiter/Owner routes */
router.get("/recruiter", requireAuth, requireRecruiter, getAllApplications);
router.get("/job/:jobId", requireAuth, requireRecruiter, getApplicationsForJob);
router.patch("/:id/status", requireAuth, requireRecruiter, updateApplicationStatus);

/* Simple apply: POST /api/applications with { jobId, coverMessage } */
router.post("/", requireAuth, requireApplicant, createApplication);

/* Full form with resume: POST /api/applications/submit (multipart/form-data) */
router.post("/submit", requireAuth, requireApplicant, upload.single("resume"), async (req, res) => {
  try {
    const { jobId, coverLetter, phone, experience, licenseType, specialty } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Missing jobId" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const parts = (req.user.name || "Applicant").trim().split(/\s+/);
    const firstName = parts[0] || "Applicant";
    const lastName = parts.slice(1).join(" ") || "—";

    const application = new Application({
      jobId,
      applicant: req.user._id,
      firstName,
      lastName,
      email: req.user.email || "",
      phone: (phone || "").trim() || "—",
      message: coverLetter || "",
      yearsExperience: experience || "",
      licenseType: licenseType || "",
      specialty: specialty || "",
      resumeUrl: req.file ? req.file.filename : null,
      status: DEFAULT_STATUS,
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (err) {
    console.error("APPLICATION ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Application failed",
    });
  }
});

module.exports = router;
