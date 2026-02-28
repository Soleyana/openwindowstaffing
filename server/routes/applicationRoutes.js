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
  exportApplicationsForJob,
  checkApplied,
  updateApplicationStatus,
} = require("../controllers/applicationController");
const emailService = require("../services/emailService");
const storageService = require("../services/storageService");
const logger = require("../utils/logger");
const { ROLES } = require("../constants/roles");
const path = require("path");
const fs = require("fs");

/* Applicant routes */
router.get("/my", requireAuth, requireApplicant, getMyApplications);
router.get("/my-stats", requireAuth, requireApplicant, getMyApplicationStats);
router.get("/check/:jobId", requireAuth, requireApplicant, checkApplied);

/* Recruiter/Owner routes */
router.get("/recruiter", requireAuth, requireRecruiter, getAllApplications);
router.get("/job/:jobId/export", requireAuth, requireRecruiter, exportApplicationsForJob);
router.get("/job/:jobId", requireAuth, requireRecruiter, getApplicationsForJob);
router.patch("/:id/status", requireAuth, requireRecruiter, updateApplicationStatus);

/* Resume download: GET /api/applications/:id/resume (auth + access check) */
router.get("/:id/resume", requireAuth, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id).populate("jobId", "createdBy");
    if (!app || !app.resumeUrl) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    const isApplicant = req.user.role === ROLES.APPLICANT;
    const isStaff = req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER;
    const applicantOwns = app.applicant && app.applicant.toString() === req.user._id.toString();
    const emailMatch = app.email && app.email.toLowerCase() === (req.user.email || "").toLowerCase();
    const staffHasJob = isStaff && app.jobId && (
      req.user.role === ROLES.OWNER ||
      (app.jobId.createdBy && app.jobId.createdBy.toString() === req.user._id.toString())
    );

    if (!((isApplicant && (applicantOwns || emailMatch)) || staffHasJob)) {
      return res.status(403).json({ success: false, message: "Not authorized to access this resume" });
    }

    const url = app.resumeUrl;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return res.redirect(302, url);
    }

    if (url.startsWith("s3:")) {
      const key = url.slice(3);
      const streamResult = await storageService.getStream(key);
      if (!streamResult) {
        return res.status(404).json({ success: false, message: "Resume not found" });
      }
      res.setHeader("Content-Type", streamResult.ContentType);
      res.setHeader("Content-Disposition", `inline; filename="resume.pdf"`);
      streamResult.Body.pipe(res);
      return;
    }

    const uploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(uploadsDir, url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Resume file not found" });
    }
    res.setHeader("Content-Disposition", 'inline; filename="resume.pdf"');
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    logger.error({ err: err.message }, "[Resume] Download error");
    res.status(500).json({ success: false, message: "Failed to load resume" });
  }
});

/* Simple apply: POST /api/applications with { jobId, coverMessage } */
router.post("/", requireAuth, requireApplicant, createApplication);

/* Full form with resume: POST /api/applications/submit (multipart/form-data) */
router.post("/submit", requireAuth, requireApplicant, upload.single("resume"), async (req, res) => {
  try {
    const {
      jobId,
      firstName,
      lastName,
      street,
      city,
      state,
      zip,
      email,
      phone,
      authorizedToWork,
      requireSponsorship,
      yearsExperience,
      hasLicense,
      licenseNumber,
      licenseState,
      licenseType,
      specialty,
      willingToTravel,
      shiftPreference,
      availableStartDate,
      certifications,
      coverLetter,
      signature,
      signatureDate,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Missing jobId" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume file is required" });
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ success: false, message: "First and last name are required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    let resumeUrl = null;
    if (storageService.isCloudStorage()) {
      const { url, key } = await storageService.upload(req.file.buffer, req.file.originalname);
      resumeUrl = url || `s3:${key}`;
    } else {
      resumeUrl = req.file.filename;
    }

    const application = new Application({
      jobId,
      applicant: req.user._id,
      firstName: (firstName || "").trim(),
      lastName: (lastName || "").trim(),
      street: (street || "").trim(),
      city: (city || "").trim(),
      state: state || "",
      zip: (zip || "").trim(),
      email: (email || req.user.email || "").trim(),
      phone: (phone || "").trim(),
      authorizedToWork: authorizedToWork || "",
      requireVisaSponsorship: requireSponsorship || "",
      yearsExperience: yearsExperience || "",
      hasLicense: hasLicense || "",
      licenseNumber: (licenseNumber || "").trim(),
      licenseState: licenseState || "",
      licenseType: licenseType || "",
      specialty: (specialty || "").trim(),
      willingToTravel: willingToTravel || "",
      shiftPreference: (shiftPreference || "").trim(),
      availableStartDate: availableStartDate || "",
      certifications: (certifications || "").trim(),
      message: (coverLetter || "").trim(),
      signature: (signature || "").trim(),
      signatureDate: signatureDate || "",
      resumeUrl,
      status: DEFAULT_STATUS,
    });

    await application.save();

    const applicantEmail = application.email;
    if (applicantEmail) {
      emailService.sendApplicationConfirmation(
        applicantEmail,
        `${application.firstName} ${application.lastName}`.trim(),
        job?.title || "the position"
      ).catch((err) => console.error("[Email] Application confirmation failed:", err?.message));
    }

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (err) {
    logger.error({ err: err.message }, "Application submit error");
    res.status(500).json({
      success: false,
      message: err.message || "Application failed",
    });
  }
});

module.exports = router;
