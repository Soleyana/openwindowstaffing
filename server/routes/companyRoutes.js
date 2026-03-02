const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter, requireOwner, requireCompanyAccess, requireCompanyOwnerOrAdmin } = require("../middleware/authMiddleware");
const companyController = require("../controllers/companyController");

router.get("/public", companyController.getPublicCompanies);
router.post("/", requireAuth, requireOwner, companyController.createCompany);
router.get("/", requireAuth, requireRecruiter, companyController.getCompanies);
router.get("/me", requireAuth, requireRecruiter, companyController.getMyCompanies);
router.get("/:companyId", requireAuth, requireRecruiter, requireCompanyAccess("params"), companyController.getCompany);
router.patch("/:companyId", requireAuth, requireRecruiter, requireCompanyAccess("params"), requireCompanyOwnerOrAdmin, companyController.updateCompany);

module.exports = router;
