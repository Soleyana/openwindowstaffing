/**
 * Company access checks for authorization.
 * Recruiters/owners gain access via RecruiterMembership or Company.ownerId.
 */
const Company = require("../models/Company");
const Facility = require("../models/Facility");
const RecruiterMembership = require("../models/RecruiterMembership");
const { ROLES } = require("../constants/roles");

/**
 * Check if user has access to company.
 * @param {string} userId
 * @param {string} companyId
 * @returns {Promise<{ allowed: boolean, company?: object, membership?: object }>}
 */
async function hasCompanyAccess(userId, companyId) {
  if (!userId || !companyId) return { allowed: false };

  const company = await Company.findById(companyId).lean();
  if (!company) return { allowed: false };

  if (company.ownerId?.toString() === userId.toString()) {
    return { allowed: true, company };
  }

  const membership = await RecruiterMembership.findOne({
    userId,
    companyId,
    status: "active",
  }).lean();

  if (membership) {
    return { allowed: true, company, membership };
  }

  return { allowed: false };
}

/**
 * Get company IDs the user can access (owner or active membership).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getAccessibleCompanyIds(userId) {
  if (!userId) return [];

  const owned = await Company.find({ ownerId: userId }).select("_id").lean();
  const memberships = await RecruiterMembership.find({
    userId,
    status: "active",
  })
    .select("companyId")
    .lean();

  const ids = new Set();
  owned.forEach((c) => ids.add(c._id.toString()));
  memberships.forEach((m) => ids.add(m.companyId?.toString()));
  return [...ids];
}

/**
 * Check if user is owner of company.
 */
async function isCompanyOwner(userId, companyId) {
  const company = await Company.findById(companyId).select("ownerId").lean();
  return company && company.ownerId?.toString() === userId.toString();
}

/**
 * Get membership for user in company.
 * @param {string} userId
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
async function getMembership(userId, companyId) {
  if (!userId || !companyId) return null;
  return RecruiterMembership.findOne({
    userId,
    companyId,
    status: "active",
  }).lean();
}

/**
 * Resolve companyId from job, application, or thread.
 * @param {object} opts - { jobId?, applicationId?, threadId? }
 * @returns {Promise<string|null>}
 */
async function resolveCompanyIdFromEntity(opts) {
  const Job = require("../models/Job");
  const Application = require("../models/Application");
  const MessageThread = require("../models/MessageThread");

  if (opts.jobId) {
    const job = await Job.findById(opts.jobId).select("companyId").lean();
    return job?.companyId?.toString() || null;
  }
  if (opts.applicationId) {
    const app = await Application.findById(opts.applicationId).select("companyId jobId").lean();
    if (app?.companyId) return app.companyId.toString();
    if (app?.jobId) {
      const job = await Job.findById(app.jobId).select("companyId").lean();
      return job?.companyId?.toString() || null;
    }
    return null;
  }
  if (opts.threadId) {
    const thread = await MessageThread.findById(opts.threadId).select("companyId").lean();
    return thread?.companyId?.toString() || null;
  }
  if (opts.facilityId) {
    const facility = await Facility.findById(opts.facilityId).select("companyId").lean();
    return facility?.companyId?.toString() || null;
  }
  return null;
}

module.exports = {
  hasCompanyAccess,
  getAccessibleCompanyIds,
  isCompanyOwner,
  getMembership,
  resolveCompanyIdFromEntity,
};
