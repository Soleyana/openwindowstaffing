const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const jobController = require("../controllers/jobController");
const { protect, recruiterOnly } = require("../middleware/authMiddleware");

// Candidate: apply to a job
router.post("/", protect, applicationController.createApplication);

// Check if current user has applied to a job
router.get("/check/:jobId", protect, applicationController.checkApplied);

// Candidate: get my applications
router.get("/my", protect, applicationController.getMyApplications);

// Recruiter: get applications for a job they own
router.get("/job/:jobId", protect, applicationController.getApplicationsForJob);

module.exports = router;
