const mongoose = require("mongoose");
const crypto = require("crypto");
const { ROLES } = require("../constants/roles");

const INVITE_EXPIRY_HOURS = 48;

function hashToken(plainToken) {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
}

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [ROLES.RECRUITER],
      default: ROLES.RECRUITER,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

inviteSchema.index({ tokenHash: 1 });
inviteSchema.index({ email: 1, used: 1 });
inviteSchema.index({ expiresAt: 1 });

inviteSchema.statics.hashToken = hashToken;

inviteSchema.statics.createInviteRecord = async function (email, plainToken, invitedById) {
  const tokenHash = hashToken(plainToken);
  return this.create({
    email: email.trim().toLowerCase(),
    role: ROLES.RECRUITER,
    tokenHash,
    invitedBy: invitedById,
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
  });
};

inviteSchema.statics.verifyAndConsume = async function (plainToken) {
  const tokenHash = hashToken(plainToken);
  const invite = await this.findOne({ tokenHash }).select("+tokenHash");
  if (!invite) return null;
  if (invite.used) return null;
  if (invite.expiresAt < new Date()) return null;
  invite.used = true;
  await invite.save();
  return invite;
};

const Invite = mongoose.model("Invite", inviteSchema);
Invite.hashToken = hashToken;
module.exports = Invite;
