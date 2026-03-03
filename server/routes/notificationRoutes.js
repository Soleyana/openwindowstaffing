const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.use(requireAuth);
router.get("/me", notificationController.getMyNotifications);
router.post("/read-all", notificationController.markAllRead);
router.post("/:id/read", notificationController.markRead);

module.exports = router;
