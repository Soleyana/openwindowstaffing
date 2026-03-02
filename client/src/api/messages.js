import api from "./axios";

/**
 * Create or find a message thread.
 * Supports: companyId, participants, applicationId, jobId, subject.
 * For candidates: pass applicationId (preferred when job may be deleted) or jobId.
 * Returns { success, data: { _id, ... } } with threadId in data._id.
 */
export async function createOrFindThread({ companyId, participants, applicationId, jobId, subject, candidateId }) {
  const body = {};
  if (companyId != null) body.companyId = companyId;
  if (participants != null) body.participants = participants;
  if (applicationId != null) body.applicationId = applicationId;
  if (jobId != null) body.jobId = jobId;
  if (subject != null) body.subject = subject;
  if (candidateId != null) body.candidateId = candidateId;
  const { data } = await api.post("messages/threads", body, { withCredentials: true });
  return data;
}

/**
 * Start a thread with a candidate in company context (e.g. for "Request Missing Documents").
 * Returns threadId.
 */
export async function createOrFindThreadForCandidate({ candidateId, companyId }) {
  const res = await createOrFindThread({ companyId, candidateId });
  return res?.data?._id || res?.data?.id || res?._id;
}

/**
 * Start a thread by application, job, or company. Returns threadId.
 * My Applications: always use applicationId (jobs can be deleted).
 */
export async function createOrFindThreadByJobOrApplication({ applicationId, jobId, companyId }) {
  const body = {};
  if (applicationId != null) body.applicationId = applicationId;
  if (jobId != null) body.jobId = jobId;
  if (companyId != null) body.companyId = companyId;

  if (!body.applicationId && !body.jobId && !body.companyId) {
    throw new Error("At least one of applicationId, jobId, or companyId is required");
  }

  const res = await createOrFindThread(body);
  return res?.data?._id || res?.data?.id;
}

export async function listThreads(params = {}) {
  const qs = new URLSearchParams();
  if (params.companyId) qs.set("companyId", params.companyId);
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  const { data } = await api.get(`messages/threads${qs.toString() ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function getThread(threadId, params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  const { data } = await api.get(`messages/threads/${threadId}${qs.toString() ? `?${qs}` : ""}`, { withCredentials: true });
  return data;
}

export async function sendMessage(threadId, body) {
  const { data } = await api.post(`messages/threads/${threadId}/messages`, { body }, { withCredentials: true });
  return data;
}

export async function markThreadRead(threadId) {
  const { data } = await api.patch(`messages/threads/${threadId}/read`, {}, { withCredentials: true });
  return data;
}

/**
 * Get options for starting a new message (applications for candidate, candidates for recruiter)
 */
export async function getStartOptions() {
  const { data } = await api.get("messages/start-options", { withCredentials: true });
  return data;
}
