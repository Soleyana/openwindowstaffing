const express = require("express");
const router = express.Router();
const { requireAuth, requireStaff, requireApplicant } = require("../middleware/authMiddleware");
const contractController = require("../controllers/contractController");
const { validateBody } = require("../middleware/validateRequest");
const { createContractSchema } = require("../validators/contractValidators");

router.use(requireAuth);
router.get("/me", requireApplicant, contractController.getMyContracts);
router.get("/", requireStaff, contractController.listContracts);
router.post("/", requireStaff, validateBody(createContractSchema), contractController.createContract);
router.get("/:id", contractController.getContract);
router.patch("/:id/send", requireStaff, contractController.sendContract);
router.post("/:id/sign", requireApplicant, contractController.signContract);
router.get("/:id/download", contractController.downloadContract);

module.exports = router;
