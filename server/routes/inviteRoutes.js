const express = require("express");
const router = express.Router();
const { requireAuth, requireOwner, requireRecruiter } = require("../middleware/authMiddleware");
const {
  createInvite,
  listInvites,
  listRecruiters,
  resendInvite,
  revokeInvite,
  getInviteByToken,
} = require("../controllers/inviteController");

router.post("/", requireAuth, requireOwner, createInvite);
router.get("/", requireAuth, requireOwner, listInvites);
router.get("/recruiters", requireAuth, requireOwner, listRecruiters);
router.post("/:id/resend", requireAuth, requireOwner, resendInvite);
router.post("/:id/revoke", requireAuth, requireOwner, revokeInvite);
router.get("/verify/:token", getInviteByToken);

module.exports = router;
