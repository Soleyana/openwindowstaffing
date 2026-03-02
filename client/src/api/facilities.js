import api from "./axios";

/** List facilities, optionally filtered by companyId */
export async function getFacilities(companyId) {
  const params = companyId ? { companyId } : {};
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`facilities${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

/** Create facility */
export async function createFacility(facilityData) {
  const { data } = await api.post("facilities", facilityData, { withCredentials: true });
  return data;
}

/** Update facility (owner/admin only) */
export async function updateFacility(facilityId, updates) {
  const { data } = await api.patch(`facilities/${facilityId}`, updates, { withCredentials: true });
  return data;
}
