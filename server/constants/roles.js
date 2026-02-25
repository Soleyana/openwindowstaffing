/**
 * Role constants. Single source of truth for RBAC.
 * Do not hardcode role strings elsewhere.
 */
const ROLES = {
  APPLICANT: "applicant",
  RECRUITER: "recruiter",
  OWNER: "owner",
};

const STAFF_ROLES = [ROLES.RECRUITER, ROLES.OWNER];

function isStaff(role) {
  return role && STAFF_ROLES.includes(role);
}

function isOwner(role) {
  return role === ROLES.OWNER;
}

function canInviteRecruiter(role) {
  return role === ROLES.OWNER;
}

module.exports = {
  ROLES,
  STAFF_ROLES,
  isStaff,
  isOwner,
  canInviteRecruiter,
};
