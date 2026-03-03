import api from "./axios";

/**
 * Get compliance status for a candidate.
 * For applicant: use "me" as candidateId; companyId/facilityId from active assignments for context.
 * For recruiter: pass candidateId, companyId, and optionally facilityId for facility-specific requirements.
 */
export async function getCandidateCompliance(candidateId, companyId = null, facilityId = null) {
  const params = {};
  if (companyId) params.companyId = companyId;
  if (facilityId) params.facilityId = facilityId;
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
 * @param {string} companyId
 * @param {string[]} candidateIds
 * @param {string} [facilityId] - Optional for facility-specific requirements
 */
export async function getComplianceBatch(companyId, candidateIds, facilityId = null) {
  if (!companyId || !candidateIds?.length) return {};
  const params = { companyId, candidateIds: candidateIds.join(",") };
  if (facilityId) params.facilityId = facilityId;
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`recruiter/compliance?${qs}`, {
    withCredentials: true,
  });
  return data?.data ?? data ?? {};
}
