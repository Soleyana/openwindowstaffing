import api from "./axios";

/** Public: list active companies (minimal, for review form etc.) */
export async function getPublicCompanies() {
  const { data } = await api.get("companies/public");
  return data;
}

export async function getMyCompanies() {
  const { data } = await api.get("companies/me", { withCredentials: true });
  return data;
}

/** List companies (recruiter/owner, scoped to accessible) */
export async function getCompanies() {
  const { data } = await api.get("companies", { withCredentials: true });
  return data;
}

/** Get single company by ID */
export async function getCompany(companyId) {
  const { data } = await api.get(`companies/${companyId}`, { withCredentials: true });
  return data;
}

export async function createCompany(companyData) {
  const { data } = await api.post("companies", companyData, { withCredentials: true });
  return data;
}

/** Update company (owner/admin only) */
export async function updateCompany(companyId, updates) {
  const { data } = await api.patch(`companies/${companyId}`, updates, { withCredentials: true });
  return data;
}
