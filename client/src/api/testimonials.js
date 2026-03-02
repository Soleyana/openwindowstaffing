import api from "./axios";

/** List approved testimonials (public) */
export async function getTestimonials(params = {}) {
  const sp = new URLSearchParams();
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.limit) sp.set("limit", params.limit);
  if (params.offset) sp.set("offset", params.offset);
  const qs = sp.toString();
  const { data } = await api.get(`testimonials${qs ? `?${qs}` : ""}`);
  return data;
}

/** Submit testimonial (public, no auth) */
export async function submitTestimonial(payload) {
  const { data } = await api.post("testimonials/submit", payload);
  return data;
}

/** Admin: list testimonials by status */
export async function getAdminTestimonials(params = {}) {
  const sp = new URLSearchParams();
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.status) sp.set("status", params.status);
  if (params.limit) sp.set("limit", params.limit);
  if (params.offset) sp.set("offset", params.offset);
  const qs = sp.toString();
  const { data } = await api.get(`testimonials/admin${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

/** Admin: approve */
export async function approveTestimonial(id) {
  const { data } = await api.patch(`testimonials/${id}/approve`, {}, { withCredentials: true });
  return data;
}

/** Admin: reject */
export async function rejectTestimonial(id, reason) {
  const { data } = await api.patch(`testimonials/${id}/reject`, { reason }, { withCredentials: true });
  return data;
}

/** Admin: hide */
export async function hideTestimonial(id) {
  const { data } = await api.patch(`testimonials/${id}/hide`, {}, { withCredentials: true });
  return data;
}

/** Admin: delete */
export async function deleteTestimonial(id) {
  const { data } = await api.delete(`testimonials/${id}`, { withCredentials: true });
  return data;
}
