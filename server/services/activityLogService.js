/**
 * Audit logging - creates ActivityLog entries for key actions.
 */
const ActivityLog = require("../models/ActivityLog");

function getClientMeta(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get?.("user-agent"),
  };
}

/**
 * Create an activity log entry.
 * @param {object} opts
 * @param {string} [opts.companyId]
 * @param {string} [opts.actorUserId]
 * @param {string} opts.targetType - Application|Candidate|Job|Document|Invite|Company|Facility
 * @param {string} [opts.targetId]
 * @param {string} opts.actionType
 * @param {string} [opts.message]
 * @param {object} [opts.metadata]
 * @param {object} [opts.req] - Express request for ip/userAgent
 */
async function log(opts) {
  const meta = opts.req ? getClientMeta(opts.req) : {};
  await ActivityLog.create({
    companyId: opts.companyId,
    actorUserId: opts.actorUserId,
    targetType: opts.targetType,
    targetId: opts.targetId,
    actionType: opts.actionType,
    message: opts.message,
    metadata: opts.metadata || {},
    ipAddress: opts.ipAddress ?? meta.ipAddress,
    userAgent: opts.userAgent ?? meta.userAgent,
  });
}

/**
 * Log from request context - fills actorUserId and client meta from req.
 */
async function logFromReq(req, opts) {
  await log({
    ...opts,
    actorUserId: req.user?._id?.toString(),
    req,
  });
}

module.exports = {
  log,
  logFromReq,
  getClientMeta,
};
