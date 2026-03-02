const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

router.use(requireAuth);

router.get("/start-options", messageController.getStartOptions);
router.post("/threads", messageController.createOrFindThread);
router.get("/threads", messageController.listThreads);
router.get("/threads/:threadId", messageController.getThread);
router.post("/threads/:threadId/messages", messageController.sendMessage);
router.patch("/threads/:threadId/read", messageController.markThreadRead);

module.exports = router;
