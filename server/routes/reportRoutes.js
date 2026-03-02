const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

router.use(requireAuth);
router.use(requireRecruiter);

router.get("/listings", reportController.getListingsReport);
router.get("/listings/export.csv", reportController.exportListingsReport);

module.exports = router;
