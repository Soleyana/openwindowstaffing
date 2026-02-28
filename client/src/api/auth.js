import api from "./axios";

function sanitizeAuthError(msg) {
  if (!msg || typeof msg !== "string") return msg;
  const lower = msg.toLowerCase();
  if (lower.includes("bad auth") || lower.includes("authentication failed") || lower.includes("mongo") || lower.includes("database connection")) {
    return "We're unable to connect to our systems right now. Please try again shortly or contact support if the issue persists.";
  }
  return msg;
}

export async function loginUser(email, password) {
  try {
    const { data } = await api.post("auth/login", { email, password }, { withCredentials: true });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(sanitizeAuthError(msg) || "Authentication failed");
  }
}

export async function registerUser(name, email, password) {
  try {
    const { data } = await api.post("auth/register", { name, email, password }, { withCredentials: true });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(sanitizeAuthError(msg) || "Registration failed");
  }
}

export async function logoutUser() {
  try {
    await api.post("auth/logout", {}, { withCredentials: true });
  } catch {
    // Ignore
  }
}

export async function fetchMe() {
  try {
    const { data } = await api.get("auth/me", { withCredentials: true });
    return data.user;
  } catch {
    return null;
  }
}

export async function acceptInvite(token, name, password) {
  try {
    const { data } = await api.post(
      "auth/accept-invite",
      { token, name, password },
      { withCredentials: true }
    );
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(msg || "Failed to accept invite");
  }
}

export async function updateProfile(updates) {
  const { data } = await api.patch("auth/me", updates, { withCredentials: true });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post("auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token, newPassword) {
  const { data } = await api.post("auth/reset-password", { token, newPassword });
  return data;
}
