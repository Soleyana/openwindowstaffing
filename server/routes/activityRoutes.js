const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const activityController = require("../controllers/activityController");

router.get("/", requireAuth, requireRecruiter, activityController.getActivity);

module.exports = router;
