import api from "./axios";

export async function getJobs() {
  const { data } = await api.get("jobs");
  return data;
}

export async function getJobById(id) {
  const { data } = await api.get(`jobs/${id}`);
  return data;
}

export async function getMyJobs() {
  const { data } = await api.get("jobs/my", { withCredentials: true });
  return data;
}

export async function createJob(jobData) {
  const { data } = await api.post("jobs", jobData, { withCredentials: true });
  return data;
}

export async function deleteJob(jobId) {
  const { data } = await api.delete(`jobs/${jobId}`, { withCredentials: true });
  return data;
}
