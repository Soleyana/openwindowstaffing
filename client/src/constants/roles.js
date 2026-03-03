/**
 * Role constants for frontend. Matches server constants.
 * Use these instead of hardcoding role strings.
 */
export const ROLES = {
  APPLICANT: "applicant",
  RECRUITER: "recruiter",
  OWNER: "owner",
  PLATFORM_ADMIN: "platformAdmin",
};

export function isStaff(role) {
  return role === ROLES.RECRUITER || role === ROLES.OWNER;
}

export function isOwner(userOrRole) {
  const role = userOrRole?.role ?? userOrRole;
  return role === ROLES.OWNER;
}

export function isPlatformAdmin(userOrRole) {
  const role = userOrRole?.role ?? userOrRole;
  return role === ROLES.PLATFORM_ADMIN;
}
