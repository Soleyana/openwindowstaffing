import API_BASE from "./config";

async function apiFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  } catch (err) {
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      throw new Error("Could not connect to server. Make sure the backend is running (npm start in the server folder).");
    }
    throw err;
  }
}

export async function loginUser(email, password) {
  const data = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return data;
}

export async function registerUser(name, email, password, role) {
  const data = await apiFetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  return data;
}
