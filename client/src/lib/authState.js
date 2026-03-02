/**
 * Module-level auth initialization flag for axios interceptor.
 * Prevents 401 redirect during initial auth/me request.
 */
let authInitialized = false;

export function setAuthInitialized(value) {
  authInitialized = value;
}

export function isAuthInitialized() {
  return authInitialized;
}
