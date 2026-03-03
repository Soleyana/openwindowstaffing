/**
 * Compliance (Clear-to-Work) calculation based on CandidateDocument.
 * Supports company-specific config and facility overrides.
 */
const CandidateDocument = require("../models/CandidateDocument");
const ComplianceReview = require("../models/ComplianceReview");
const Company = require("../models/Company");
const Facility = require("../models/Facility");

const DEFAULT_REQUIRED = ["License", "BLS", "TB", "Background"];
const DEFAULT_EXPIRING_DAYS = 30;

function normalizeStatus(s) {
  if (!s) return "pending";
  const lower = String(s).toLowerCase();
  return ["pending", "verified", "rejected"].includes(lower) ? lower : "pending";
}

/**
 * Resolve required doc types for companyId + optional facilityId.
 * @param {string} companyId
 * @param {string|null} facilityId
 * @returns {Promise<{ requiredTypes: string[], expiringSoonDays: number }>}
 */
async function getRequiredTypes(companyId, facilityId = null) {
  let requiredTypes = [...DEFAULT_REQUIRED];
  let expiringSoonDays = DEFAULT_EXPIRING_DAYS;

  if (companyId) {
    const company = await Company.findById(companyId).select("complianceConfig").lean();
    if (company?.complianceConfig) {
      const cfg = company.complianceConfig;
      if (cfg.requiredTypes?.length) requiredTypes = [...cfg.requiredTypes];
      if (typeof cfg.expiringSoonDays === "number" && cfg.expiringSoonDays > 0) {
        expiringSoonDays = cfg.expiringSoonDays;
      }
    }
  }

  if (facilityId) {
    const facility = await Facility.findById(facilityId).select("complianceOverrides").lean();
    if (facility?.complianceOverrides?.requiredTypes?.length) {
      requiredTypes = [...facility.complianceOverrides.requiredTypes];
    }
  }

  return { requiredTypes, expiringSoonDays };
}

/**
 * Compute compliance status for a candidate.
 * @param {string|ObjectId} candidateId
 * @param {string|ObjectId} [companyId] - For config and lastReviewedAt
 * @param {string|ObjectId} [facilityId] - For facility-specific overrides
 * @returns {Promise<{ status, missing, expiringSoon, verified, lastReviewedAt, requiredTypes }>}
 */
async function computeCompliance(candidateId, companyId = null, facilityId = null) {
  const { requiredTypes, expiringSoonDays } = await getRequiredTypes(
    companyId?.toString?.() ?? companyId,
    facilityId?.toString?.() ?? facilityId
  );

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
  const expiringThreshold = new Date(now.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);

  const missing = [];
  const expiringSoon = [];
  const verified = [];

  let hasRejected = false;

  for (const type of requiredTypes) {
    const list = byType[type] || [];
    const best = list
      .filter((d) => d.verifiedStatus === "verified")
      .sort((a, b) => (b.expiresAt ? 1 : 0) - (a.expiresAt ? 1 : 0))[0];
    const hasRejectedForType = list.some((d) => d.verifiedStatus === "rejected");

    if (hasRejectedForType) hasRejected = true;

    if (!best) {
      if (hasRejectedForType) missing.push(type);
      else missing.push(type);
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

  const allTypes = [...new Set(docs.map((d) => d.type))];
  allTypes.forEach((type) => {
    if (requiredTypes.includes(type)) return;
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
  if (hasRejected) status = "blocked";
  else if (missing.length > 0) status = "missing";
  else if (expiringSoon.length > 0) status = "expiring";

  return {
    status,
    missing,
    expiringSoon,
    verified,
    lastReviewedAt,
    requiredTypes,
  };
}

/**
 * Compute compliance for multiple candidates (batch).
 * @param {string[]} candidateIds
 * @param {string} companyId
 * @param {string|null} [facilityId]
 * @returns {Promise<Record<string, { status, missing?, expiringSoon? }>>}
 */
async function computeComplianceBatch(candidateIds, companyId, facilityId = null) {
  if (!candidateIds?.length) return {};

  const { requiredTypes, expiringSoonDays } = await getRequiredTypes(companyId, facilityId);

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

  const now = new Date();
  const expiringThreshold = new Date(now.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);

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

    const missing = [];
    const expiringSoon = [];
    let hasRejected = false;

    for (const type of requiredTypes) {
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
  getRequiredTypes,
  REQUIRED_DOC_TYPES: DEFAULT_REQUIRED,
};
