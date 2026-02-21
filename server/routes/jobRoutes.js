const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const applicationController = require("../controllers/applicationController");
const { protect, recruiterOnly } = require("../middleware/authMiddleware");

router.post("/", protect, recruiterOnly, jobController.createJob);
router.get("/", jobController.getAllJobs);
router.get("/my", protect, recruiterOnly, applicationController.getMyJobs);
router.get("/:id", jobController.getJobById);
router.delete("/:id", protect, recruiterOnly, jobController.deleteJob);

module.exports = router;
