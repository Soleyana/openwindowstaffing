import api from "./axios";

export async function checkSaved(jobId) {
  const { data } = await api.get(`saved-jobs/check/${jobId}`, { withCredentials: true });
  return data;
}

export async function getSavedJobs() {
  const { data } = await api.get("saved-jobs", { withCredentials: true });
  return data;
}

export async function saveJob(jobId) {
  const { data } = await api.post("saved-jobs", { jobId }, { withCredentials: true });
  return data;
}

export async function unsaveJob(jobId) {
  const { data } = await api.delete(`saved-jobs/${jobId}`, { withCredentials: true });
  return data;
}
