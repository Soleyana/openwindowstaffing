import axios from "axios";

/**
 * API requests go to /api (relative) - Vite proxy forwards to backend in dev.
 * withCredentials: true enables cookie-based auth.
 */
const api = axios.create({
  baseURL: "/api",
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
