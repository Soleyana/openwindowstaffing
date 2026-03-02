import api from "./axios";

/**
 * Get compliance status for a candidate.
 * For applicant: use "me" as candidateId, no companyId.
 * For recruiter: pass candidateId and companyId.
 */
export async function getCandidateCompliance(candidateId, companyId = null) {
  const params = companyId ? { companyId } : {};
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(
    `candidates/${candidateId}/compliance${qs ? `?${qs}` : ""}`,
    { withCredentials: true }
  );
  return data?.data ?? data;
}

/**
 * Record a compliance review (recruiter/owner only).
 */
export async function reviewCandidateCompliance(candidateId, note = "", companyId = null) {
  const body = { note: note || undefined };
  if (companyId) body.companyId = companyId;
  const { data } = await api.post(
    `candidates/${candidateId}/compliance/review`,
    body,
    { withCredentials: true }
  );
  return data?.data ?? data;
}

/**
 * Get compliance status for multiple candidates (pipeline batch).
 */
export async function getComplianceBatch(companyId, candidateIds) {
  if (!companyId || !candidateIds?.length) return {};
  const qs = new URLSearchParams({
    companyId,
    candidateIds: candidateIds.join(","),
  }).toString();
  const { data } = await api.get(`recruiter/compliance?${qs}`, {
    withCredentials: true,
  });
  return data?.data ?? data ?? {};
}
