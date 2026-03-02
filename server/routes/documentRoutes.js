const express = require("express");
const router = express.Router();
const { requireAuth, requireApplicant, requireRecruiter } = require("../middleware/authMiddleware");
const documentController = require("../controllers/documentController");
const documentUpload = require("../middleware/documentUpload");

router.get("/:docId/download", requireAuth, documentController.downloadDocument);
router.patch("/:docId/verify", requireAuth, requireRecruiter, documentController.verifyDocument);

module.exports = router;
