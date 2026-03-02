const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const savedJobController = require("../controllers/savedJobController");

router.get("/", requireAuth, savedJobController.getSavedJobs);
router.get("/check/:jobId", requireAuth, savedJobController.checkSaved);
router.post("/", requireAuth, savedJobController.saveJob);
router.delete("/:jobId", requireAuth, savedJobController.unsaveJob);

module.exports = router;
