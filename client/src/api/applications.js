import api from "./axios";

export async function submitFullApplication(formData) {
  const { data } = await api.post("applications/submit", formData, { withCredentials: true });
  return data;
}

export async function applyToJob(jobId, coverMessage = "") {
  const { data } = await api.post("applications", { jobId, coverMessage }, { withCredentials: true });
  return data;
}

export async function checkApplied(jobId) {
  try {
    const { data } = await api.get(`applications/check/${jobId}`, { withCredentials: true });
    return data;
  } catch {
    return { applied: false };
  }
}

export async function getMyApplications() {
  const { data } = await api.get("applications/my", { withCredentials: true });
  return data;
}

export async function getMyApplicationStats() {
  const { data } = await api.get("applications/my-stats", { withCredentials: true });
  return data;
}

export async function getApplicationsForJob(jobId) {
  const { data } = await api.get(`applications/job/${jobId}`, { withCredentials: true });
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

async function downloadBlobAsCsv(blob, res, defaultPrefix) {
  const ct = (res.headers["content-type"] || "").toLowerCase();
  if (ct.includes("application/json") || ct.includes("text/plain")) {
    const msg = await parseBlobError(blob);
    throw new Error(msg);
  }
  const cd = res.headers["content-disposition"];
  const match = cd && cd.match(/filename="?([^";\n]+)"?/);
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = match ? match[1] : `${defaultPrefix}-${ts}.csv`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportApplicationsForJob(jobId) {
  try {
    const res = await api.get(`applications/job/${jobId}/export`, { withCredentials: true, responseType: "blob" });
    if (res.status < 200 || res.status >= 300) {
      const msg = await parseBlobError(res.data);
      throw new Error(msg);
    }
    await downloadBlobAsCsv(res.data, res, `applicants-${jobId}`);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const msg = await parseBlobError(err.response.data);
      throw new Error(msg);
    }
    throw err;
  }
}

/**
 * Export applications as CSV with filters (companyId, jobId, status, from, to).
 * Uses env-based API base (VITE_API_URL). Returns blob download or throws with error message.
 */
export async function exportApplicationsCsv(filters = {}) {
  const params = new URLSearchParams();
  if (filters.companyId) params.set("companyId", filters.companyId);
  if (filters.jobId) params.set("jobId", filters.jobId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  const url = `applications/export.csv${qs ? `?${qs}` : ""}`;
  try {
    const res = await api.get(url, { withCredentials: true, responseType: "blob" });
    if (res.status < 200 || res.status >= 300) {
      const msg = await parseBlobError(res.data);
      throw new Error(msg);
    }
    await downloadBlobAsCsv(res.data, res, "applications");
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      const msg = await parseBlobError(err.response.data);
      throw new Error(msg);
    }
    throw err;
  }
}
