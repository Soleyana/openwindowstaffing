const express = require("express");
const router = express.Router();
const { requireAuth, requirePlatformAdmin } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

router.use(requireAuth, requirePlatformAdmin);
router.get("/companies", adminController.getAllCompanies);
router.get("/system", adminController.getSystemInfo);
router.post("/test-email", adminController.sendTestEmail);

module.exports = router;
