import api from "./axios";

export async function getAllApplications() {
  const { data } = await api.get("applications/recruiter", { withCredentials: true });
  return data;
}

export async function updateApplicationStatus(applicationId, status) {
  const { data } = await api.patch(
    `applications/${applicationId}/status`,
    { status },
    { withCredentials: true }
  );
  return data;
}
