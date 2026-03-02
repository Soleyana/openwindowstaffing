/**
 * Compliance (Clear-to-Work) calculation based on CandidateDocument.
 * Required docs for cleared: License, BLS, TB, Background.
 */
const CandidateDocument = require("../models/CandidateDocument");
const ComplianceReview = require("../models/ComplianceReview");

const REQUIRED_DOC_TYPES = ["License", "BLS", "TB", "Background"];
const EXPIRING_DAYS = 30;

function normalizeStatus(s) {
  if (!s) return "pending";
  const lower = String(s).toLowerCase();
  return ["pending", "verified", "rejected"].includes(lower) ? lower : "pending";
}

/**
 * Compute compliance status for a candidate.
 * @param {string|ObjectId} candidateId - User ID (applicant)
 * @param {string|ObjectId} [companyId] - Optional; used for lastReviewedAt lookup
 * @returns {Promise<{ status, missing, expiringSoon, verified, lastReviewedAt }>}
 */
async function computeCompliance(candidateId, companyId = null) {
  const docs = await CandidateDocument.find({ userId: candidateId })
    .select("type verifiedStatus expiresAt")
    .lean();

  const byType = {};
  docs.forEach((d) => {
    const type = d.type;
    if (!byType[type]) byType[type] = [];
    byType[type].push({
      verifiedStatus: normalizeStatus(d.verifiedStatus),
      expiresAt: d.expiresAt,
    });
  });

  const now = new Date();
  const expiringThreshold = new Date(now.getTime() + EXPIRING_DAYS * 24 * 60 * 60 * 1000);

  const missing = [];
  const expiringSoon = [];
  const verified = [];

  let hasRejected = false;

  for (const type of REQUIRED_DOC_TYPES) {
    const list = byType[type] || [];
    const best = list
      .filter((d) => d.verifiedStatus === "verified")
      .sort((a, b) => (b.expiresAt ? 1 : 0) - (a.expiresAt ? 1 : 0))[0];
    const hasRejectedForType = list.some((d) => d.verifiedStatus === "rejected");

    if (hasRejectedForType) hasRejected = true;

    if (!best) {
      if (hasRejectedForType) {
        // Rejected counts as blocked; include in missing for clarity
        missing.push(type);
      } else {
        missing.push(type);
      }
      continue;
    }

    verified.push(type);

    if (best.expiresAt) {
      const exp = new Date(best.expiresAt);
      if (exp < now || exp <= expiringThreshold) {
        expiringSoon.push({ type, expiresAt: best.expiresAt });
      }
    }
  }

  // Non-required verified docs
  const allTypes = [...new Set(docs.map((d) => d.type))];
  allTypes.forEach((type) => {
    if (REQUIRED_DOC_TYPES.includes(type)) return;
    const list = (byType[type] || []).filter((d) => d.verifiedStatus === "verified");
    if (list.length > 0) verified.push(type);
  });

  let lastReviewedAt = null;
  if (companyId) {
    const latest = await ComplianceReview.findOne({ candidateId, companyId })
      .sort({ reviewedAt: -1 })
      .select("reviewedAt")
      .lean();
    lastReviewedAt = latest?.reviewedAt || null;
  }

  let status = "cleared";
  if (hasRejected) {
    status = "blocked";
  } else if (missing.length > 0) {
    status = "missing";
  } else if (expiringSoon.length > 0) {
    status = "expiring";
  }

  return {
    status,
    missing,
    expiringSoon,
    verified,
    lastReviewedAt,
  };
}

/**
 * Compute compliance for multiple candidates (batch, for pipeline).
 * @param {string[]} candidateIds - User IDs
 * @param {string} companyId - Required for recruiter access
 * @returns {Promise<Record<string, { status, missing?, expiringSoon? }>>}
 */
async function computeComplianceBatch(candidateIds, companyId) {
  if (!candidateIds?.length) return {};

  const results = {};
  const docs = await CandidateDocument.find({
    userId: { $in: candidateIds },
  })
    .select("userId type verifiedStatus expiresAt")
    .lean();

  const byUser = {};
  docs.forEach((d) => {
    const uid = d.userId?.toString();
    if (!uid) return;
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(d);
  });

  for (const cid of candidateIds) {
    const uid = cid.toString?.() || cid;
    const userDocs = byUser[uid] || [];
    const byType = {};
    userDocs.forEach((d) => {
      const type = d.type;
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        verifiedStatus: normalizeStatus(d.verifiedStatus),
        expiresAt: d.expiresAt,
      });
    });

    const now = new Date();
    const expiringThreshold = new Date(now.getTime() + EXPIRING_DAYS * 24 * 60 * 60 * 1000);
    const missing = [];
    const expiringSoon = [];
    let hasRejected = false;

    for (const type of REQUIRED_DOC_TYPES) {
      const list = byType[type] || [];
      const hasRej = list.some((d) => d.verifiedStatus === "rejected");
      if (hasRej) hasRejected = true;

      const best = list.filter((d) => d.verifiedStatus === "verified")[0];
      if (!best) {
        missing.push(type);
        continue;
      }
      if (best.expiresAt) {
        const exp = new Date(best.expiresAt);
        if (exp < now || exp <= expiringThreshold) {
          expiringSoon.push({ type, expiresAt: best.expiresAt });
        }
      }
    }

    let status = "cleared";
    if (hasRejected) status = "blocked";
    else if (missing.length > 0) status = "missing";
    else if (expiringSoon.length > 0) status = "expiring";

    results[uid] = { status, missing, expiringSoon };
  }

  return results;
}

module.exports = {
  computeCompliance,
  computeComplianceBatch,
  REQUIRED_DOC_TYPES,
};
