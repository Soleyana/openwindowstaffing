import { isStaff } from "../constants/roles";

export const REDIRECT_KEY = "redirectAfterLogin";
export const LAST_PROTECTED_KEY = "lastProtectedRoute";

export function getRedirectTarget(user, locationStateFrom) {
  const statePath = locationStateFrom?.pathname;
  if (statePath && statePath !== "/login" && statePath !== "/signup") {
    return statePath + (locationStateFrom?.search || "");
  }
  try {
    const stored = sessionStorage.getItem(REDIRECT_KEY);
    if (stored) {
      sessionStorage.removeItem(REDIRECT_KEY);
      return stored;
    }
    const last = sessionStorage.getItem(LAST_PROTECTED_KEY);
    if (last) return last;
  } catch {
    /* ignore */
  }
  return "/onboarding";
}

export function setLastProtectedRoute(path) {
  try {
    if (path && path !== "/login" && path !== "/signup") {
      sessionStorage.setItem(LAST_PROTECTED_KEY, path);
    }
  } catch {
    /* ignore */
  }
}
