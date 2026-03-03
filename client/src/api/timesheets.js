import api from "./axios";

export async function getMyTimesheets(params = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const qs = search.toString();
  const { data } = await api.get(`timesheets/me${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getTimesheets(params = {}) {
  const search = new URLSearchParams();
  if (params.companyId) search.set("companyId", params.companyId);
  if (params.status) search.set("status", params.status);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.candidateId) search.set("candidateId", params.candidateId);
  const qs = search.toString();
  const { data } = await api.get(`timesheets${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getTimesheet(id) {
  const { data } = await api.get(`timesheets/${id}`, { withCredentials: true });
  return data;
}

export async function createTimesheet(payload) {
  const { data } = await api.post("timesheets", payload, { withCredentials: true });
  return data;
}

export async function updateTimesheet(id, payload) {
  const { data } = await api.patch(`timesheets/${id}`, payload, { withCredentials: true });
  return data;
}

export async function submitTimesheet(id) {
  const { data } = await api.post(`timesheets/${id}/submit`, {}, { withCredentials: true });
  return data;
}

export async function approveTimesheet(id) {
  const { data } = await api.patch(`timesheets/${id}/approve`, {}, { withCredentials: true });
  return data;
}

export async function rejectTimesheet(id, reason) {
  const { data } = await api.patch(`timesheets/${id}/reject`, { reason }, { withCredentials: true });
  return data;
}
