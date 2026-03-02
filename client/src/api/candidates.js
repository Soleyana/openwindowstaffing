import api from "./axios";

export async function getMyProfile() {
  const { data } = await api.get("candidates/me", { withCredentials: true });
  return data;
}

export async function updateMyProfile(profile) {
  const { data } = await api.put("candidates/me", profile, { withCredentials: true });
  return data;
}

export async function uploadDocument(formData) {
  const { data } = await api.post("candidates/me/documents", formData, { withCredentials: true });
  return data;
}
