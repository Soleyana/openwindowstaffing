const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.post("/accept-invite", authController.acceptInvite);
router.patch("/me", requireAuth, authController.updateProfile);

module.exports = router;
