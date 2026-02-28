import api from "./axios";

/**
 * Submit the contact form. Expects POST /api/contact with { name, email, subject?, message }.
 */
export async function submitContact({ name, email, subject, message }) {
  const { data } = await api.post("contact", {
    name,
    email,
    subject: subject || undefined,
    message,
  });
  return data;
}
