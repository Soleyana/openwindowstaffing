import api from "./axios";

export async function subscribeNewsletter(email) {
  const { data } = await api.post("newsletter/subscribe", { email });
  return data;
}

export async function unsubscribeNewsletter(token) {
  const { data } = await api.post("newsletter/unsubscribe", { token });
  return data;
}
