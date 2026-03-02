const express = require("express");
const router = express.Router();
const { requireAuth, requireApplicant, requireRecruiter } = require("../middleware/authMiddleware");
const candidateController = require("../controllers/candidateController");
const documentController = require("../controllers/documentController");
const complianceController = require("../controllers/complianceController");
const documentUpload = require("../middleware/documentUpload");

router.get("/me", requireAuth, requireApplicant, candidateController.getMyProfile);
router.put("/me", requireAuth, requireApplicant, candidateController.updateMyProfile);
router.post("/me/documents", requireAuth, requireApplicant, documentUpload.single("file"), documentController.uploadDocument);

router.get("/:candidateId/compliance", requireAuth, complianceController.getCompliance);
router.post("/:candidateId/compliance/review", requireAuth, requireRecruiter, complianceController.reviewCompliance);

module.exports = router;
