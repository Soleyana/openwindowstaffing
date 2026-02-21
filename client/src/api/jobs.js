import API_BASE from "./config";

export async function getJobs() {
  const res = await fetch(`${API_BASE}/jobs`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load jobs");
  return data;
}

export async function getJobById(id) {
  const res = await fetch(`${API_BASE}/jobs/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Job not found");
  return data;
}

export async function getMyJobs(token) {
  const res = await fetch(`${API_BASE}/jobs/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load jobs");
  return data;
}

export async function createJob(token, jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to post job");
  }
  return data;
}

export async function deleteJob(token, jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete job");
  return data;
}
