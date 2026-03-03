const express = require("express");
const router = express.Router();
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");
const { validateBody } = require("../middleware/validateRequest");
const { maybeRateLimit } = require("../middleware/maybeRateLimit");
const { loginLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
} = require("../validators/authValidators");

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", maybeRateLimit(loginLimiter, "/api/auth/login"), validateBody(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", maybeRateLimit(passwordResetLimiter, "/api/auth/forgot-password"), validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", maybeRateLimit(passwordResetLimiter, "/api/auth/reset-password"), validateBody(resetPasswordSchema), authController.resetPassword);
router.get("/me", optionalAuth, authController.me);
router.post("/accept-invite", validateBody(acceptInviteSchema), authController.acceptInvite);
router.patch("/me", requireAuth, authController.updateProfile);

module.exports = router;
