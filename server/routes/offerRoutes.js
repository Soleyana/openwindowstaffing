const express = require("express");
const router = express.Router();
const { requireAuth, requireStaff, requireApplicant } = require("../middleware/authMiddleware");
const offerController = require("../controllers/offerController");
const { validateBody } = require("../middleware/validateRequest");
const { createOfferSchema } = require("../validators/offerValidators");

router.use(requireAuth);
router.get("/me", requireApplicant, offerController.getMyOffers);
router.post("/", requireStaff, validateBody(createOfferSchema), offerController.createOffer);
router.get("/", requireStaff, offerController.listOffers);
router.get("/:id", offerController.getOffer);
router.patch("/:id/send", requireStaff, offerController.sendOffer);
router.patch("/:id/accept", requireApplicant, offerController.acceptOffer);
router.patch("/:id/decline", requireApplicant, offerController.declineOffer);
router.patch("/:id/withdraw", requireStaff, offerController.withdrawOffer);

module.exports = router;
