const crypto = require("crypto");
const User = require("../models/User");
const { ROLES } = require("../constants/roles");

const TOKEN_BYTES = 32;

/**
 * Generate a cryptographically secure random token for invites.
 */
function generateInviteToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Determine role for a new user.
 * Rule: First user in DB becomes owner. All public registrations = applicant.
 */
async function resolveRoleForRegistration() {
  const count = await User.countDocuments();
  return count === 0 ? ROLES.OWNER : ROLES.APPLICANT;
}

/**
 * Resolve role for invite acceptance. Invites only create recruiters.
 */
function resolveRoleForInvite(invite) {
  return invite?.role === ROLES.RECRUITER ? ROLES.RECRUITER : null;
}

module.exports = {
  generateInviteToken,
  resolveRoleForRegistration,
  resolveRoleForInvite,
};
