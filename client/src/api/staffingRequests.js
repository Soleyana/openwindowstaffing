import api from "./axios";

export async function listStaffingRequests() {
  const { data } = await api.get("staffing-requests", { withCredentials: true });
  return data;
}

export async function createStaffingRequest(payload) {
  const { data } = await api.post("staffing-requests", payload, { withCredentials: true });
  return data;
}

export async function updateStaffingRequest(id, updates) {
  const { data } = await api.patch(`staffing-requests/${id}`, updates, { withCredentials: true });
  return data;
}
