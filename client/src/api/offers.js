import api from "./axios";

export async function createOffer(payload) {
  const { data } = await api.post("/offers", payload);
  return data;
}

export async function getOffers(params = {}) {
  const { data } = await api.get("/offers", { params });
  return data;
}

export async function getMyOffers() {
  const { data } = await api.get("/offers/me");
  return data;
}

export async function getOffer(id) {
  const { data } = await api.get(`/offers/${id}`);
  return data;
}

export async function sendOffer(id) {
  const { data } = await api.patch(`/offers/${id}/send`);
  return data;
}

export async function acceptOffer(id) {
  const { data } = await api.patch(`/offers/${id}/accept`);
  return data;
}

export async function declineOffer(id) {
  const { data } = await api.patch(`/offers/${id}/decline`);
  return data;
}

export async function withdrawOffer(id) {
  const { data } = await api.patch(`/offers/${id}/withdraw`);
  return data;
}
