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

export async function searchCandidates(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`recruiter/candidates${qs ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getCandidateDetail(candidateId) {
  const { data } = await api.get(`recruiter/candidates/${candidateId}`, { withCredentials: true });
  return data;
}

export async function verifyDocument(docId, verifiedStatus, notes) {
  const { data } = await api.patch(`documents/${docId}/verify`, { verifiedStatus, notes }, { withCredentials: true });
  return data;
}
