/**
 * API base URL from environment. Production: VITE_API_URL (e.g. https://api.example.com/api).
 * Local dev: "/api" - Vite proxy forwards to backend.
 * No hardcoded domains.
 */
export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export default API_BASE;
