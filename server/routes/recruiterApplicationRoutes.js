const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const {
  getAllApplications,
  updateStatus,
  addNote,
  getApplicantsForJob,
} = require("../controllers/recruiterApplicationController");
const {
  searchCandidates,
  getCandidateDetail,
} = require("../controllers/recruiterCandidateController");
const { getComplianceBatch } = require("../controllers/complianceController");

router.use(requireAuth, requireRecruiter);

router.get("/compliance", getComplianceBatch);
router.get("/candidates", searchCandidates);
router.get("/candidates/:candidateId", getCandidateDetail);
router.get("/applications", getAllApplications);
router.patch("/applications/:id/status", updateStatus);
router.post("/applications/:id/notes", addNote);
router.get("/jobs/:jobId/applicants", getApplicantsForJob);

module.exports = router;
