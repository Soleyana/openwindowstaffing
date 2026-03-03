import api from "./axios";

export async function getMyAssignments() {
  const { data } = await api.get("assignments/me", { withCredentials: true });
  return data;
}

export async function getAssignments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.status) params.set("status", filters.status);
  if (filters.candidateId) params.set("candidateId", filters.candidateId);
  if (filters.jobId) params.set("jobId", filters.jobId);
  const qs = params.toString();
  const { data } = await api.get(`assignments${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getAssignment(id) {
  const { data } = await api.get(`assignments/${id}`, { withCredentials: true });
  return data;
}

export async function createAssignment(payload) {
  const { data } = await api.post("assignments", payload, { withCredentials: true });
  return data;
}

export async function updateAssignment(id, payload) {
  const { data } = await api.patch(`assignments/${id}`, payload, { withCredentials: true });
  return data;
}

export async function offerAssignment(id) {
  const { data } = await api.post(`assignments/${id}/offer`, {}, { withCredentials: true });
  return data;
}

export async function acceptAssignment(id) {
  const { data } = await api.post(`assignments/${id}/accept`, {}, { withCredentials: true });
  return data;
}
