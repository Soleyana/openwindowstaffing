/**
 * Candidate/candidate profile business logic.
 */
const User = require("../models/User");
const CandidateProfile = require("../models/CandidateProfile");
const Application = require("../models/Application");
const CandidateDocument = require("../models/CandidateDocument");
const Job = require("../models/Job");
const { getAccessibleJobIds } = require("./applicationService");
const { getAccessibleCompanyIds } = require("./companyAccessService");

/**
 * Get or create candidate profile for user.
 */
async function getOrCreateProfile(userId) {
  let profile = await CandidateProfile.findOne({ userId });
  if (!profile) {
    profile = await CandidateProfile.create({ userId });
  }
  return profile;
}

/**
 * Get candidate IDs that recruiter can access (applicants to their jobs).
 * Uses both legacy job.createdBy and new company membership.
 */
async function getAccessibleCandidateIds(user) {
  const jobIds = await getAccessibleJobIds(user);
  const companyIds = await getAccessibleCompanyIds(user._id.toString());

  const applications = await Application.find({
    $or: [
      { jobId: { $in: jobIds } },
      ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
    ],
  })
    .select("applicant")
    .lean();

  const ids = new Set();
  applications.forEach((a) => {
    if (a.applicant) ids.add(a.applicant.toString());
  });
  return [...ids];
}

/**
 * Recruiter candidate search with filters.
 */
async function searchCandidates(user, filters = {}) {
  const candidateIds = await getAccessibleCandidateIds(user);
  if (candidateIds.length === 0) return { candidates: [], total: 0 };

  const query = { userId: { $in: candidateIds } };

  if (filters.specialty) {
    query.specialties = { $in: [filters.specialty] };
  }
  if (filters.licenseState) {
    query["license.state"] = filters.licenseState;
  }
  if (filters.expiringSoon === "true") {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    query.$or = [
      { "license.expiresAt": { $lte: in30Days, $gt: new Date() } },
      { "certifications.expiresAt": { $lte: in30Days, $gt: new Date() } },
    ];
  }

  const profiles = await CandidateProfile.find(query)
    .populate("userId", "name email")
    .lean();

  const profileByUserId = {};
  profiles.forEach((p) => {
    const uid = p.userId?._id?.toString();
    if (uid) profileByUserId[uid] = p;
  });

  const hasFilters = filters.specialty || filters.licenseState || filters.expiringSoon === "true";
  let candidates = profiles.map((p) => ({
    profile: p,
    user: p.userId,
    userId: p.userId?._id,
  }));

  if (!hasFilters) {
    const userIdsWithoutProfile = candidateIds.filter((id) => !profileByUserId[id]);
    const usersWithoutProfile = userIdsWithoutProfile.length > 0
      ? await User.find({ _id: { $in: userIdsWithoutProfile } }).select("name email").lean()
      : [];
    candidates = [
      ...candidates,
      ...usersWithoutProfile.map((u) => ({
        profile: {},
        user: u,
        userId: u._id,
      })),
    ];
  }

  if (filters.verifiedStatus) {
    const status = String(filters.verifiedStatus).toLowerCase();
    const statusVariants = [status, status.charAt(0).toUpperCase() + status.slice(1)];
    const docFilter = { userId: { $in: candidateIds }, verifiedStatus: { $in: statusVariants } };
    const docsWithStatus = await CandidateDocument.find(docFilter)
      .select("userId")
      .lean();
    const idsWithStatus = new Set(docsWithStatus.map((d) => d.userId.toString()));
    candidates = candidates.filter((c) => idsWithStatus.has(c.userId?._id?.toString()));
  }

  const total = candidates.length;

  return {
    candidates,
    total,
  };
}

module.exports = {
  getOrCreateProfile,
  getAccessibleCandidateIds,
  searchCandidates,
};
