const Invite = require("../models/Invite");
const User = require("../models/User");
const Company = require("../models/Company");
const RecruiterMembership = require("../models/RecruiterMembership");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const activityLogService = require("../services/activityLogService");
const { hasCompanyAccess } = require("../services/companyAccessService");
const { getClientUrl } = require("../config/env");
const { ROLES } = require("../constants/roles");
const authService = require("../services/authService");
const emailService = require("../services/emailService");

exports.createInvite = async (req, res) => {
  try {
    const { email, companyId, role } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId is required" });
    }

    const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "You do not have access to this company" });
    }

    const inviteRole = role === ROLES.OWNER ? ROLES.OWNER : ROLES.RECRUITER;

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && [ROLES.RECRUITER, ROLES.OWNER].includes(existingUser.role)) {
      const hasMembership = await RecruiterMembership.findOne({
        userId: existingUser._id,
        companyId,
        status: "active",
      });
      if (hasMembership) {
        return res.status(400).json({
          success: false,
          message: "This person already has access to this company.",
        });
      }
    }

    const pendingQuery = { email: normalizedEmail, companyId, used: false, status: "active", expiresAt: { $gt: new Date() } };
    let existingInvite = await Invite.findOne(pendingQuery);

    if (existingInvite) {
      const plainToken = authService.generateInviteToken();
      existingInvite.tokenHash = Invite.hashToken(plainToken);
      existingInvite.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await existingInvite.save();

      const baseUrl = getClientUrl();
      const inviteUrl = `${baseUrl}/invite/${plainToken}`;

      const company = await Company.findById(companyId).select("name").lean();
      emailService.sendInviteToRecruiter(normalizedEmail, inviteUrl, company?.name, { requestId: req.requestId }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: "Invite already pending. Use this link (or revoke and create new).",
        data: {
          email: existingInvite.email,
          inviteLink: inviteUrl,
          expiresAt: existingInvite.expiresAt,
          alreadyExists: true,
        },
        requestId: req.requestId,
      });
    }

    let invite;
    const plainToken = authService.generateInviteToken();
    try {
      invite = await Invite.createInviteRecord(normalizedEmail, plainToken, req.user._id, companyId, inviteRole);
    } catch (createErr) {
      if (createErr.code === 11000) {
        existingInvite = await Invite.findOne(pendingQuery);
        if (existingInvite) {
          const newToken = authService.generateInviteToken();
          existingInvite.tokenHash = Invite.hashToken(newToken);
          existingInvite.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
          await existingInvite.save();
          const baseUrl = getClientUrl();
          const inviteUrl = `${baseUrl}/invite/${newToken}`;
          const company = await Company.findById(companyId).select("name").lean();
          emailService.sendInviteToRecruiter(normalizedEmail, inviteUrl, company?.name, { requestId: req.requestId }).catch(() => {});
          return res.status(200).json({
            success: true,
            message: "Invite already pending. Use this link.",
            data: { email: existingInvite.email, inviteLink: inviteUrl, expiresAt: existingInvite.expiresAt, alreadyExists: true },
            requestId: req.requestId,
          });
        }
      }
      throw createErr;
    }

    const baseUrl = getClientUrl();
    const inviteUrl = `${baseUrl}/invite/${plainToken}`;

    await activityLogService.logFromReq(req, {
      companyId: invite.companyId?.toString?.() || companyId,
      targetType: "Invite",
      targetId: invite._id.toString(),
      actionType: "invite_sent",
      message: `Invite sent to ${invite.email}`,
    });

    const company = await Company.findById(companyId).select("name").lean();
    emailService.sendInviteToRecruiter(normalizedEmail, inviteUrl, company?.name, { requestId: req.requestId }).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Invite created. Share the link with this person.",
      data: { email: invite.email, inviteLink: inviteUrl, expiresAt: invite.expiresAt },
      requestId: req.requestId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create invite"),
      requestId: req.requestId,
    });
  }
};

exports.listInvites = async (req, res) => {
  try {
    const invites = await Invite.find({ invitedBy: req.user._id })
      .sort({ createdAt: -1 })
      .select("-tokenHash")
      .lean();

    res.status(200).json({ success: true, data: invites });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch invites"),
    });
  }
};

exports.listRecruiters = async (req, res) => {
  try {
    const recruiters = await User.find({ role: ROLES.RECRUITER })
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: recruiters });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch recruiters"),
    });
  }
};

exports.resendInvite = async (req, res) => {
  try {
    const { id } = req.params;

    const invite = await Invite.findById(id);
    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found" });
    }
    if (invite.invitedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (invite.used) {
      return res.status(400).json({ success: false, message: "Invite has already been used" });
    }
    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invite has expired" });
    }

    const plainToken = authService.generateInviteToken();
    invite.tokenHash = Invite.hashToken(plainToken);
    invite.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await invite.save();

    const baseUrl = getClientUrl();
    const inviteUrl = `${baseUrl}/invite/${plainToken}`;

    const company = await Company.findById(invite.companyId).select("name").lean();
    emailService.sendInviteToRecruiter(invite.email, inviteUrl, company?.name, { requestId: req.requestId }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Invite resent.",
      data: { inviteLink: inviteUrl, expiresAt: invite.expiresAt },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to resend invite"),
    });
  }
};

exports.revokeInvite = async (req, res) => {
  try {
    const { id } = req.params;

    const invite = await Invite.findById(id);
    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found" });
    }
    if (invite.invitedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    invite.used = true;
    await invite.save();

    await activityLogService.logFromReq(req, {
      targetType: "Invite",
      targetId: invite._id.toString(),
      actionType: "invite_revoked",
      message: `Invite revoked for ${invite.email}`,
    });

    res.status(200).json({ success: true, message: "Invite revoked" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to revoke invite"),
    });
  }
};

/** Public: validate invite token and return email (for accept-invite page) */
exports.getInviteByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({
      tokenHash: Invite.hashToken(token),
      used: false,
      expiresAt: { $gt: new Date() },
    })
      .select("email role companyId")
      .populate("companyId", "name");

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invalid or expired invite" });
    }

    res.status(200).json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        companyId: invite.companyId?._id,
        companyName: invite.companyId?.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to verify invite"),
    });
  }
};
