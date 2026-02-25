const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const {
  getAllApplications,
  updateStatus,
  addNote,
  getApplicantsForJob,
} = require("../controllers/recruiterApplicationController");

router.use(requireAuth, requireRecruiter);

router.get("/applications", getAllApplications);
router.patch("/applications/:id/status", updateStatus);
router.post("/applications/:id/notes", addNote);
router.get("/jobs/:jobId/applicants", getApplicantsForJob);

module.exports = router;
