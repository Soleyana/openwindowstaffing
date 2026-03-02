import api from "./axios";

export async function subscribeJobAlerts({ email, keywords, category, location }) {
  const { data } = await api.post("job-alerts/subscribe", {
    email,
    keywords: keywords || undefined,
    category: category || undefined,
    location: location || undefined,
  });
  return data;
}
