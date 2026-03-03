const express = require("express");
const router = express.Router();
const { requireAuth, requireApplicant, requireRecruiter } = require("../middleware/authMiddleware");
const timesheetController = require("../controllers/timesheetController");
const { validateBody } = require("../middleware/validateRequest");
const { createTimesheetSchema } = require("../validators/timesheetValidators");

router.post("/", requireAuth, requireApplicant, validateBody(createTimesheetSchema), timesheetController.createTimesheet);
router.get("/me", requireAuth, requireApplicant, timesheetController.getMyTimesheets);
router.get("/", requireAuth, requireRecruiter, timesheetController.listTimesheets);
router.get("/:id", requireAuth, timesheetController.getTimesheet);
router.patch("/:id", requireAuth, requireApplicant, timesheetController.updateTimesheet);
router.post("/:id/submit", requireAuth, requireApplicant, timesheetController.submitTimesheet);
router.patch("/:id/approve", requireAuth, requireRecruiter, timesheetController.approveTimesheet);
router.patch("/:id/reject", requireAuth, requireRecruiter, timesheetController.rejectTimesheet);

module.exports = router;
