/**
 * Assignment service - transitions, scoping, helpers.
 */
const Assignment = require("../models/Assignment");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { ROLES } = require("../constants/roles");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("./companyAccessService");

/** Allowed status transitions */
const TRANSITIONS = {
  drafted: ["offered", "cancelled"],
  offered: ["accepted", "cancelled"],
  accepted: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function canTransition(fromStatus, toStatus) {
  const allowed = TRANSITIONS[fromStatus];
  return allowed && allowed.includes(toStatus);
}

/** Check if recruiter/owner can access assignment (via company) */
async function canAccessAssignment(user, assignmentId) {
  const assignment = await Assignment.findById(assignmentId).select("companyId").lean();
  if (!assignment) return false;
  if (user.role === ROLES.OWNER) return true;
  const { allowed } = await hasCompanyAccess(user._id.toString(), assignment.companyId?.toString());
  return allowed;
}

/** Check if applicant owns assignment */
function applicantOwnsAssignment(assignment, userId) {
  return assignment.candidateId?.toString() === userId?.toString();
}

/** Get assignment IDs for recruiter - company-scoped */
async function getAssignmentsForRecruiter(user, filters = {}) {
  const { companyId, status, candidateId, jobId } = filters;
  let companyIds = [];

  if (companyId) {
    const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
    if (!allowed) return [];
    companyIds = [companyId];
  } else {
    companyIds = await getAccessibleCompanyIds(user._id.toString());
    if (companyIds.length === 0) return [];
  }

  const query = { companyId: { $in: companyIds } };
  if (status) query.status = status;
  if (candidateId) query.candidateId = candidateId;
  if (jobId) query.jobId = jobId;

  return Assignment.find(query)
    .populate("jobId", "title company location")
    .populate("applicationId", "firstName lastName email")
    .populate("candidateId", "name email")
    .sort({ updatedAt: -1 })
    .lean();
}

/** Get active assignments by candidate for pipeline indicator */
async function getActiveAssignmentIdsByCandidate(companyIds, candidateIds) {
  if (!companyIds?.length || !candidateIds?.length) return {};
  const docs = await Assignment.find({
    companyId: { $in: companyIds },
    candidateId: { $in: candidateIds },
    status: { $in: ["active", "accepted", "offered"] },
  })
    .select("candidateId")
    .lean();
  const map = {};
  for (const d of docs) {
    const cid = d.candidateId?.toString?.();
    if (cid) map[cid] = true;
  }
  return map;
}

module.exports = {
  canTransition,
  canAccessAssignment,
  applicantOwnsAssignment,
  getAssignmentsForRecruiter,
  getActiveAssignmentIdsByCandidate,
  TRANSITIONS,
};
