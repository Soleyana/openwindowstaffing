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
