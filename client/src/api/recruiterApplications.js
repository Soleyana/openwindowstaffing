import api from "./axios";

export async function getRecruiterApplications() {
  const { data } = await api.get("recruiter/applications", { withCredentials: true });
  return data;
}

export async function updateRecruiterApplicationStatus(applicationId, status) {
  const { data } = await api.patch(
    `recruiter/applications/${applicationId}/status`,
    { status },
    { withCredentials: true }
  );
  return data;
}

export async function addRecruiterNote(applicationId, text) {
  const { data } = await api.post(
    `recruiter/applications/${applicationId}/notes`,
    { text },
    { withCredentials: true }
  );
  return data;
}

export async function getApplicantsForJob(jobId) {
  const { data } = await api.get(`recruiter/jobs/${jobId}/applicants`, { withCredentials: true });
  return data;
}
