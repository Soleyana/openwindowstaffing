import api from "./axios";

export async function getContracts(params = {}) {
  const { data } = await api.get("/contracts", { params });
  return data;
}

export async function getMyContracts() {
  const { data } = await api.get("/contracts/me");
  return data;
}

export async function getContract(id) {
  const { data } = await api.get(`/contracts/${id}`);
  return data;
}

export async function createContract(payload) {
  const { data } = await api.post("/contracts", payload);
  return data;
}

export async function sendContract(id) {
  const { data } = await api.patch(`/contracts/${id}/send`);
  return data;
}

export async function signContract(id, payload) {
  const { data } = await api.post(`/contracts/${id}/sign`, payload);
  return data;
}

export async function downloadContract(id) {
  const res = await api.get(`/contracts/${id}/download`, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contract-${id}-signed.html`;
  a.click();
  URL.revokeObjectURL(url);
}
