const express = require("express");
const router = express.Router();
const { newsletterLimiter } = require("../middleware/rateLimiter");
const { maybeRateLimit } = require("../middleware/maybeRateLimit");
const newsletterController = require("../controllers/newsletterController");

router.post("/subscribe", maybeRateLimit(newsletterLimiter), newsletterController.subscribe);
router.post("/unsubscribe", newsletterController.unsubscribe);
router.get("/unsubscribe", newsletterController.unsubscribe);

module.exports = router;
