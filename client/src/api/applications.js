import API_BASE from "./config";

export async function applyToJob(token, jobId, coverMessage = "") {
  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jobId, coverMessage }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to apply");
  return data;
}

export async function checkApplied(token, jobId) {
  const res = await fetch(`${API_BASE}/applications/check/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) return { applied: false };
  return data;
}

export async function getMyApplications(token) {
  const res = await fetch(`${API_BASE}/applications/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load applications");
  return data;
}

export async function getApplicationsForJob(token, jobId) {
  const res = await fetch(`${API_BASE}/applications/job/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load applicants");
  return data;
}
