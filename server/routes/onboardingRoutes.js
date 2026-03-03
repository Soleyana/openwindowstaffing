const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const onboardingController = require("../controllers/onboardingController");

router.use(requireAuth);
router.get("/", onboardingController.getChecklist);
router.patch("/step", onboardingController.markStepComplete);

module.exports = router;
