import axios from "axios";

/**
 * baseURL: VITE_API_URL in production (e.g. https://openwindowstaffing-1.onrender.com/api).
 * Fallback to "/api" for local dev (Vite proxy forwards to backend).
 * withCredentials: true enables cookie-based auth (httpOnly cookies).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* FormData: do NOT set Content-Type - browser adds multipart boundary */
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

export default api;
