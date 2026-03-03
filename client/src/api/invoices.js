import api from "./axios";

/**
 * POST /api/invoices/request
 * Body: { companyId, message? }
 */
export async function requestInvoice({ companyId, message }) {
  const { data } = await api.post("invoices/request", { companyId, message }, { withCredentials: true });
  return data;
}

export async function generateInvoice({ companyId, from, to }) {
  const { data } = await api.post("invoices/generate", { companyId, from, to }, { withCredentials: true });
  return data;
}

export async function getInvoices(params = {}) {
  const search = new URLSearchParams();
  if (params.companyId) search.set("companyId", params.companyId);
  if (params.status) search.set("status", params.status);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const qs = search.toString();
  const { data } = await api.get(`invoices${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getInvoice(id) {
  const { data } = await api.get(`invoices/${id}`, { withCredentials: true });
  return data;
}

export async function issueInvoice(id) {
  const { data } = await api.post(`invoices/${id}/issue`, {}, { withCredentials: true });
  return data;
}

export async function markPaidInvoice(id) {
  const { data } = await api.post(`invoices/${id}/mark-paid`, {}, { withCredentials: true });
  return data;
}

/**
 * Download invoice CSV or HTML (print to PDF).
 */
export async function downloadInvoiceExport(id, format = "csv") {
  const base = api.defaults.baseURL || "/api";
  const url = `${base}/invoices/${id}/export?format=${format === "pdf" || format === "html" ? "html" : "csv"}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(res.statusText || "Export failed");
  const blob = await res.blob();
  const ext = format === "pdf" || format === "html" ? "html" : "csv";
  const filename = `invoice-${id}.${ext}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const downloadInvoiceCsv = (id) => downloadInvoiceExport(id, "csv");
