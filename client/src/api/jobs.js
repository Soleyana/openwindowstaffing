import api from "./axios";

export async function getJobs(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.keywords) searchParams.set("keywords", params.keywords);
  if (params.location) searchParams.set("location", params.location);
  if (params.category) searchParams.set("category", params.category);
  if (params.company) searchParams.set("company", params.company);
  if (params.jobType) searchParams.set("jobType", Array.isArray(params.jobType) ? params.jobType.join(",") : params.jobType);
  if (params.company) searchParams.set("company", params.company);
  const qs = searchParams.toString();
  const { data } = await api.get(qs ? `jobs?${qs}` : "jobs");
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
