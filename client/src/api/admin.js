import api from "./axios";

export async function getAdminCompanies() {
  const { data } = await api.get("/admin/companies");
  return data;
}

export async function getAdminSystem() {
  const { data } = await api.get("/admin/system");
  return data;
}
