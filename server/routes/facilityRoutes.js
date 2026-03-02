const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter, requireCompanyAccess, requireCompanyOwnerOrAdmin } = require("../middleware/authMiddleware");
const facilityController = require("../controllers/facilityController");

router.post("/", requireAuth, requireRecruiter, facilityController.createFacility);
router.get("/", requireAuth, requireRecruiter, facilityController.getFacilities);
router.patch("/:facilityId", requireAuth, requireRecruiter, requireCompanyAccess("params"), requireCompanyOwnerOrAdmin, facilityController.updateFacility);

module.exports = router;
