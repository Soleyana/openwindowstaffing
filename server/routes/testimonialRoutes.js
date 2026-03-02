const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter, requireCompanyAccess } = require("../middleware/authMiddleware");
const testimonialController = require("../controllers/testimonialController");
const { testimonialSubmitLimiter } = require("../middleware/rateLimiter");
const { maybeRateLimit } = require("../middleware/maybeRateLimit");

router.post("/submit", maybeRateLimit(testimonialSubmitLimiter), testimonialController.submit);
router.get("/", testimonialController.list);

router.get("/admin", requireAuth, requireRecruiter, requireCompanyAccess("query"), testimonialController.adminList);
router.patch("/:id/approve", requireAuth, requireRecruiter, testimonialController.approve);
router.patch("/:id/reject", requireAuth, requireRecruiter, testimonialController.reject);
router.patch("/:id/hide", requireAuth, requireRecruiter, testimonialController.hide);
router.delete("/:id", requireAuth, requireRecruiter, testimonialController.deleteTestimonial);

module.exports = router;
