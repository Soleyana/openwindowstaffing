/**
 * Centralized frontend config. All values from environment.
 * Production: set VITE_API_URL, VITE_COMPANY_NAME, VITE_CONTACT_EMAIL, VITE_CONTACT_PHONE in .env
 */
/** Password rules – shown on signup/change-password forms. Must match server policy. */
export const PASSWORD_RULES = import.meta.env.VITE_PASSWORD_RULES || "At least 8 characters, including uppercase, lowercase, and a number";

/** Company branding – configurable via env for white-label deployment */
export const BRAND = {
  companyName: import.meta.env.VITE_COMPANY_NAME || "Open Window Staffing",
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || "jobs@openwindowstaffing.com",
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || "1-888-373-6736",
};
