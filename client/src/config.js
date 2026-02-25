/**
 * Centralized frontend config. All values from environment.
 * Production: set VITE_API_URL, VITE_COMPANY_NAME, VITE_CONTACT_EMAIL, VITE_CONTACT_PHONE in .env
 */
const isDev = import.meta.env.DEV;
const apiUrl = import.meta.env.VITE_API_URL;

/** Base URL for static assets (e.g. uploads). Use "" in dev so /uploads goes through proxy. */
export const API_BASE_URL = isDev ? "" : (apiUrl || "");

/** Company branding – configurable via env for white-label deployment */
export const BRAND = {
  companyName: import.meta.env.VITE_COMPANY_NAME || "Open Window Staffing",
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || "jobs@openwindowstaffing.com",
  contactPhone: import.meta.env.VITE_CONTACT_PHONE || "1-888-373-6736",
};

if (!isDev && !apiUrl) {
  console.warn("VITE_API_URL is not set. API calls may fail in production.");
}
