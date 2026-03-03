const express = require("express");
const router = express.Router();
const { requireAuth, requireApplicant, requireRecruiter } = require("../middleware/authMiddleware");
const assignmentController = require("../controllers/assignmentController");

router.post("/", requireAuth, requireRecruiter, assignmentController.createAssignment);
router.get("/me", requireAuth, requireApplicant, assignmentController.getMyAssignments);
router.get("/", requireAuth, requireRecruiter, assignmentController.listAssignments);
router.get("/:id", requireAuth, assignmentController.getAssignment);
router.patch("/:id", requireAuth, requireRecruiter, assignmentController.updateAssignment);
router.post("/:id/offer", requireAuth, requireRecruiter, assignmentController.offerAssignment);
router.post("/:id/accept", requireAuth, requireApplicant, assignmentController.acceptAssignment);

module.exports = router;
