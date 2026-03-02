import api from "./axios";

/**
 * GET /api/reports/listings
 * Query: companyId, from, to, jobId, facilityId, status
 */
export async function getListingsReport(filters = {}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.jobId) params.set("jobId", filters.jobId);
  if (filters.facilityId) params.set("facilityId", filters.facilityId);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  const { data } = await api.get(`reports/listings${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

async function parseBlobError(blob) {
  try {
    const text = await blob.text();
    const json = JSON.parse(text);
    return json.message || "Export failed";
  } catch {
    return "Export failed";
  }
}

/**
 * Export listing report as CSV
 */
export async function exportListingsReport(filters = {}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.jobId) params.set("jobId", filters.jobId);
  if (filters.facilityId) params.set("facilityId", filters.facilityId);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  const url = `reports/listings/export.csv${qs ? `?${qs}` : ""}`;
  try {
    const res = await api.get(url, { withCredentials: true, responseType: "blob" });
    if (res.status < 200 || res.status >= 300) {
      const msg = await parseBlobError(res.data);
      throw new Error(msg);
    }
    const ct = (res.headers["content-type"] || "").toLowerCase();
    if (ct.includes("application/json") || ct.includes("text/plain")) {
      const msg = await parseBlobError(res.data);
      throw new Error(msg);
    }
    const cd = res.headers["content-disposition"];
    const match = cd && cd.match(/filename="?([^";\n]+)"?/);
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = match ? match[1] : `listing-report-${ts}.csv`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(res.data);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const msg = await parseBlobError(err.response.data);
      throw new Error(msg);
    }
    throw err;
  }
}
