import api from "./axios";

/**
 * POST /api/invoices/request
 * Body: { companyId, message? }
 */
export async function requestInvoice({ companyId, message }) {
  const { data } = await api.post("invoices/request", { companyId, message }, { withCredentials: true });
  return data;
}
