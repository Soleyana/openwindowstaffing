import api from "./axios";

export async function getMyNotifications(params = {}) {
  const { data } = await api.get("/notifications/me", { params });
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.post(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post("/notifications/read-all");
  return data;
}
