const mongoose = require("mongoose");
const MessageThread = require("../models/MessageThread");
const Message = require("../models/Message");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const { ROLES } = require("../constants/roles");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const logger = require("../utils/logger");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function getParticipantsForThread(applicantId, recruiterId) {
  const participants = [];
  if (applicantId) participants.push({ userId: toObjectId(applicantId), role: "candidate" });
  if (recruiterId) participants.push({ userId: toObjectId(recruiterId), role: "recruiter" });
  return participants;
}

/**
 * GET /api/messages/start-options
 * For candidates: applications they can message from (with recruiter/company context)
 * For recruiters: candidates they can message (from pipeline/applications)
 */
exports.getStartOptions = async (req, res) => {
  try {
    const Application = require("../models/Application");
    const Job = require("../models/Job");

    if (req.user.role === ROLES.APPLICANT) {
      const applications = await Application.find({
        $or: [{ applicant: req.user._id }, { email: req.user.email?.toLowerCase() }],
      })
        .populate("jobId", "title company location createdBy")
        .populate("jobId.createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const options = applications
        .filter((a) => a.companyId || a.jobId?.companyId)
        .map((a) => ({
          applicationId: a._id.toString(),
          jobTitle: a.jobId?.title || "—",
          companyName: a.jobId?.company || "—",
          recruiterName: a.jobId?.createdBy?.name || a.jobId?.createdBy?.email || "Recruiter",
          companyId: (a.companyId || a.jobId?.companyId)?.toString(),
        }));

      return res.status(200).json({ success: true, data: { applications: options } });
    }

    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    if (companyIds.length === 0) {
      return res.status(200).json({ success: true, data: { candidates: [] } });
    }

    const jobIds = await Job.find({
      $or: [{ createdBy: req.user._id }, { companyId: { $in: companyIds } }],
    })
      .select("_id")
      .lean();
    const jids = jobIds.map((j) => j._id);

    const applications = await Application.find({ jobId: { $in: jids } })
      .select("applicant firstName lastName email companyId jobId")
      .populate("jobId", "title company")
      .populate("applicant", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const seen = new Set();
    const candidates = applications
      .filter((a) => {
        const applicantId = a.applicant?.toString?.() || a.email?.toLowerCase();
        if (!applicantId || seen.has(applicantId)) return false;
        seen.add(applicantId);
        return (a.companyId || a.jobId?.companyId) && companyIds.includes((a.companyId || a.jobId?.companyId)?.toString());
      })
      .map((a) => ({
        applicationId: a._id.toString(),
        candidateName: a.applicant?.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email || "—",
        candidateEmail: a.applicant?.email || a.email,
        jobTitle: a.jobId?.title || "—",
        companyName: a.jobId?.company || "—",
        companyId: (a.companyId || a.jobId?.companyId)?.toString(),
      }));

    return res.status(200).json({ success: true, data: { candidates } });
  } catch (error) {
    logger.error({ err: error.message }, "Get start options error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to load options"),
    });
  }
};

/**
 * POST /api/messages/threads - Create or find thread.
 * Body: { companyId, participants: [{ userId, role }], applicationId?, jobId?, subject? }
 */
exports.createOrFindThread = async (req, res) => {
  try {
    const { companyId, participants, applicationId, jobId, subject, candidateId } = req.body;

    const Application = require("../models/Application");
    const Job = require("../models/Job");
    let resolvedParticipants = participants;
    let resolvedApplicationId = applicationId;

    if (candidateId && companyId && (req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER) && (!participants || participants.length === 0)) {
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Access denied to this company" });
      }
      const companyJobs = await Job.find({ companyId }).select("_id").lean();
      const jobIds = companyJobs.map((j) => j._id);
      const app = await Application.findOne({
        applicant: toObjectId(candidateId),
        $or: [{ companyId: toObjectId(companyId) }, { jobId: { $in: jobIds } }],
      })
        .select("_id")
        .sort({ createdAt: -1 })
        .lean();
      if (app) resolvedApplicationId = app._id.toString();
      resolvedParticipants = getParticipantsForThread(candidateId, req.user._id.toString());
    } else if (applicationId && (!participants || participants.length === 0)) {
      const app = await Application.findById(applicationId)
        .select("applicant")
        .populate("jobId", "createdBy")
        .lean();
      if (app) {
        const applicantId = app.applicant?.toString?.();
        if (!applicantId && (req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER)) {
          return res.status(400).json({ success: false, message: "This applicant has no account to message. They applied without signing in." });
        }
        if (req.user.role === ROLES.APPLICANT && applicantId !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: "You can only start threads for your own applications" });
        }
        const recruiterId = (req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER)
          ? req.user._id.toString()
          : app.jobId?.createdBy?.toString?.();
        resolvedParticipants = getParticipantsForThread(applicantId, recruiterId);
      }
    } else if (jobId && (!participants || participants.length === 0)) {
      const job = await Job.findById(jobId).select("createdBy").lean();
      if (job?.createdBy) {
        resolvedParticipants = getParticipantsForThread(
          req.user._id.toString(),
          job.createdBy.toString()
        );
      }
    }

    const userIds = (resolvedParticipants || participants || [])
      .map((p) => (typeof p === "string" ? p : p?.userId))
      .filter(Boolean);
    if (!req.user.role || req.user.role === ROLES.APPLICANT) {
      if (!userIds.includes(req.user._id.toString())) {
        userIds.push(req.user._id.toString());
      }
    }
    if (userIds.length < 2) {
      return res.status(400).json({ success: false, message: "At least 2 participants required" });
    }

    const participantIds = (resolvedParticipants || participants || [])
      .map((p) => toObjectId(typeof p === "object" ? p.userId : p))
      .filter(Boolean);

    let resolvedCompanyId = companyId?.toString?.();
    if (!resolvedCompanyId && (jobId || applicationId || candidateId)) {
      if (applicationId) {
        const app = await Application.findById(applicationId).select("companyId jobId").populate("jobId", "companyId").lean();
        resolvedCompanyId = app?.companyId?.toString() || app?.jobId?.companyId?.toString();
      }
      if (!resolvedCompanyId && jobId) {
        const job = await Job.findById(jobId).select("companyId createdBy").lean();
        resolvedCompanyId = job?.companyId?.toString();
      }
      if (!resolvedCompanyId && candidateId) {
        resolvedCompanyId = companyId?.toString();
      }
      if (!resolvedCompanyId && (req.user.role === ROLES.RECRUITER || req.user.role === ROLES.OWNER)) {
        const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
        if (companyIds.length > 0) resolvedCompanyId = companyIds[0];
      }
    }
    if (!resolvedCompanyId) {
      return res.status(400).json({ success: false, message: "companyId is required, or provide jobId/applicationId to resolve it" });
    }
    const isApplicant = req.user.role === ROLES.APPLICANT;
    if (companyId) {
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
      if (!allowed) return res.status(403).json({ success: false, message: "Access denied" });
    } else if (!isApplicant) {
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), resolvedCompanyId);
      if (!allowed) return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (participantIds.length >= 2) {
      const existing = await MessageThread.findOne({
        companyId: resolvedCompanyId,
        $and: participantIds.map((id) => ({ "participants.userId": id })),
      }).sort({ lastMessageAt: -1 });

      if (existing) {
        return res.status(200).json({ success: true, data: existing });
      }
    }

    const thread = await MessageThread.create({
      companyId: resolvedCompanyId,
      jobId: jobId || null,
      applicationId: resolvedApplicationId || applicationId || null,
      participants: (resolvedParticipants || participants || []).map((p) => {
        if (typeof p === "object" && p.userId) return p;
        return { userId: toObjectId(p), role: "candidate" };
      }),
      subject: subject || "Message thread",
    });

    await activityLogService.logFromReq(req, {
      companyId: resolvedCompanyId,
      targetType: "MessageThread",
      targetId: thread._id.toString(),
      actionType: "created",
      message: "Message thread created",
      metadata: { applicationId },
    });

    res.status(201).json({ success: true, data: thread });
  } catch (error) {
    logger.error({ err: error.message }, "Create thread error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create thread"),
    });
  }
};

/**
 * GET /api/messages/threads?companyId=...&page=&limit=
 */
exports.listThreads = async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    let query = {};
    if (companyId) {
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      query.companyId = companyId;
    }
    if (req.user.role === ROLES.APPLICANT || !companyId) {
      query["participants.userId"] = req.user._id;
    } else {
      const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
      if (companyIds.length > 0) {
        query.companyId = { $in: companyIds };
      }
      query["participants.userId"] = req.user._id;
    }

    const threads = await MessageThread.find(query)
      .populate("participants.userId", "name email")
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await MessageThread.countDocuments(query);

    const Message = require("../models/Message");
    const threadIds = threads.map((t) => t._id);
    const [unreadCounts, lastMsgRows] = await Promise.all([
      Promise.all(
        threads.map(async (t) => {
          const count = await Message.countDocuments({
            threadId: t._id,
            senderId: { $ne: req.user._id },
            "readBy.userId": { $ne: req.user._id },
          });
          return { threadId: t._id.toString(), unread: count };
        })
      ),
      Message.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$threadId", body: { $first: "$body" } } },
      ]),
    ]);
    const lastMessages = Object.fromEntries(
      lastMsgRows.map((r) => [r._id?.toString(), r])
    );
    const unreadMap = Object.fromEntries(unreadCounts.map((u) => [u.threadId, u.unread]));

    const data = threads.map((t) => {
      const last = lastMessages[t._id.toString()];
      const preview = last?.body ? (last.body.length > 60 ? last.body.slice(0, 60) + "…" : last.body) : null;
      return {
        ...t,
        unreadCount: unreadMap[t._id.toString()] || 0,
        lastMessagePreview: preview,
      };
    });

    res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error({ err: error.message }, "List threads error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to list threads"),
    });
  }
};

/**
 * GET /api/messages/threads/:threadId
 */
exports.getThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const thread = await MessageThread.findById(threadId)
      .populate("participants.userId", "name email")
      .lean();

    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    const isParticipant = thread.participants?.some(
      (p) => p.userId?._id?.toString() === req.user._id.toString()
    );
    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    const hasCompanyAccessForThread = companyIds.includes(thread.companyId?.toString());

    if (!isParticipant && !hasCompanyAccessForThread) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await Message.find({ threadId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({ threadId });

    res.status(200).json({
      success: true,
      data: { thread, messages },
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Get thread error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to get thread"),
    });
  }
};

/**
 * POST /api/messages/threads/:threadId/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: "Message body is required" });
    }

    const thread = await MessageThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    const isParticipant = thread.participants?.some(
      (p) => p.userId?.toString() === req.user._id.toString()
    );
    const { allowed } = await hasCompanyAccess(req.user._id.toString(), thread.companyId);

    if (!isParticipant && !allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const message = await Message.create({
      threadId,
      companyId: thread.companyId,
      senderId: req.user._id,
      body: String(body).trim(),
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    await activityLogService.logFromReq(req, {
      companyId: thread.companyId.toString(),
      targetType: "Message",
      targetId: message._id.toString(),
      actionType: "created",
      message: "Message sent",
      metadata: { threadId },
    });

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email")
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error({ err: error.message }, "Send message error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to send message"),
    });
  }
};

/**
 * PATCH /api/messages/threads/:threadId/read
 */
exports.markThreadRead = async (req, res) => {
  try {
    const { threadId } = req.params;

    const thread = await MessageThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found" });
    }

    const isParticipant = thread.participants?.some(
      (p) => p.userId?.toString() === req.user._id.toString()
    );
    const { allowed } = await hasCompanyAccess(req.user._id.toString(), thread.companyId);

    if (!isParticipant && !allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Message.updateMany(
      { threadId, senderId: { $ne: req.user._id } },
      { $addToSet: { readBy: { userId: req.user._id, readAt: new Date() } } }
    );

    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    logger.error({ err: error.message }, "Mark read error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to mark as read"),
    });
  }
};
