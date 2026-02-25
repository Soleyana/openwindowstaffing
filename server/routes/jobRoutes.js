const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const applicationController = require("../controllers/applicationController");
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");

router.post("/", requireAuth, requireRecruiter, jobController.createJob);
router.put("/:id", requireAuth, requireRecruiter, jobController.updateJob);
router.get("/", jobController.getAllJobs);
router.get("/my", requireAuth, requireRecruiter, applicationController.getMyJobs);
router.get("/:id", jobController.getJobById);
router.delete("/:id", requireAuth, requireRecruiter, jobController.deleteJob);

module.exports = router;
