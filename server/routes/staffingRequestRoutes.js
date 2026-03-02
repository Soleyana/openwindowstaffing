const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const staffingRequestController = require("../controllers/staffingRequestController");

router.post("/", requireAuth, requireRecruiter, staffingRequestController.create);
router.get("/", requireAuth, requireRecruiter, staffingRequestController.list);
router.patch("/:id", requireAuth, requireRecruiter, staffingRequestController.update);
router.patch("/:id", requireAuth, requireRecruiter, staffingRequestController.update);

module.exports = router;
