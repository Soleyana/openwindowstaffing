/**
 * Offer controller.
 * Recruiter/owner: create, list, send, withdraw. Applicant: list own, accept, decline.
 */
const Offer = require("../models/Offer");
const Assignment = require("../models/Assignment");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const notificationService = require("../services/notificationService");
const emailService = require("../services/emailService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { OFFER_STATUSES } = require("../models/Offer");
const { isValidPipelineStatus } = require("../constants/applicationStatuses");

function toIdString(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

async function ensureCompanyAccess(user, companyId) {
  const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
  return !!allowed;
}

/**
 * POST /api/offers - Create offer (recruiter/owner).
 */
exports.createOffer = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { applicationId, facilityId, payRate, billRate, startDate, scheduleNotes, contractType } = req.body;
    if (!applicationId) {
      return res.status(400).json({ success: false, message: "applicationId required" });
    }

    const app = await Application.findById(applicationId)
      .populate("jobId", "title companyId facilityId")
      .lean();
    if (!app) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const companyId = toIdString(app.companyId) || toIdString(app.jobId?.companyId);
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Application has no company" });
    }

    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const candidateId = toIdString(app.applicant) || app.applicant;
    if (!candidateId) {
      return res.status(400).json({ success: false, message: "Application has no applicant" });
    }

    const existingActive = await Offer.findOne({
      companyId,
      applicationId,
      status: { $in: ["draft", "sent"] },
    });
    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: "An active offer already exists for this application",
      });
    }

    const offer = await Offer.create({
      companyId,
      facilityId: facilityId || app.facilityId || app.jobId?.facilityId,
      jobId: app.jobId?._id || app.jobId,
      applicationId,
      candidateId,
      recruiterId: req.user._id,
      payRate: payRate != null ? Number(payRate) : undefined,
      billRate: billRate != null ? Number(billRate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      scheduleNotes: scheduleNotes || undefined,
      contractType: contractType || undefined,
      status: "draft",
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Offer",
      targetId: offer._id.toString(),
      actionType: "offer_created",
      message: `Offer created by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId, applicationId, jobId: offer.jobId?.toString() },
    });

    const populated = await Offer.findById(offer._id)
      .populate("jobId", "title")
      .populate("applicationId", "status")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create offer"),
    });
  }
};

/**
 * GET /api/offers - List offers (recruiter/owner, company-scoped).
 */
exports.listOffers = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { companyId, status, jobId, candidateId } = req.query;
    let companyIds = [];
    if (companyId) {
      const hasAccess = await ensureCompanyAccess(req.user, companyId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Access denied to this company" });
      }
      companyIds = [companyId];
    } else {
      companyIds = await getAccessibleCompanyIds(req.user._id.toString());
      if (companyIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const query = { companyId: { $in: companyIds } };
    if (status && OFFER_STATUSES.includes(status)) query.status = status;
    if (jobId) query.jobId = jobId;
    if (candidateId) query.candidateId = candidateId;

    const offers = await Offer.find(query)
      .populate("jobId", "title")
      .populate("applicationId", "status firstName lastName email")
      .populate("candidateId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch offers"),
    });
  }
};

/**
 * GET /api/offers/me - Applicant's own offers.
 */
exports.getMyOffers = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const offers = await Offer.find({ candidateId: req.user._id })
      .populate("jobId", "title company facilityId location")
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch offers"),
    });
  }
};

/**
 * GET /api/offers/:id - Get single offer (scoped).
 */
exports.getOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("jobId", "title company location")
      .populate("companyId", "name")
      .populate("applicationId", "status")
      .lean();

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (req.user.role === ROLES.APPLICANT) {
      if (offer.candidateId?.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: "Offer not found" });
      }
    } else if (STAFF_ROLES.includes(req.user.role)) {
      const hasAccess = await ensureCompanyAccess(req.user, toIdString(offer.companyId));
      if (!hasAccess) {
        return res.status(404).json({ success: false, message: "Offer not found" });
      }
    } else {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    return res.status(200).json({ success: true, data: offer });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch offer"),
    });
  }
};

/**
 * PATCH /api/offers/:id/send - Send offer (recruiter/owner).
 */
exports.sendOffer = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const offer = await Offer.findById(req.params.id)
      .populate("jobId", "title")
      .populate("candidateId", "name email");
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const hasAccess = await ensureCompanyAccess(req.user, toIdString(offer.companyId));
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Cannot send: offer is ${offer.status}`,
      });
    }

    offer.status = "sent";
    offer.sentAt = new Date();
    await offer.save();

    const companyId = toIdString(offer.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Offer",
      targetId: offer._id.toString(),
      actionType: "offer_sent",
      message: `Offer sent by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId: offer.candidateId?.toString(), jobId: offer.jobId?.toString() },
    });

    const candidateEmail = offer.candidateId?.email || offer.candidateId;
    const candidateName = offer.candidateId?.name || "there";
    const jobTitle = offer.jobId?.title || "the role";
    if (candidateEmail && typeof candidateEmail === "string") {
      emailService.sendOfferToCandidate(candidateEmail, candidateName, jobTitle).catch(() => {});
    }

    await notificationService.create({
      userId: offer.candidateId?._id || offer.candidateId,
      companyId: offer.companyId,
      type: "offer_sent",
      title: "You have a job offer",
      body: `You have been offered a position for ${jobTitle}.`,
      url: "/my-offers",
    });

    const updated = await Offer.findById(offer._id)
      .populate("jobId", "title")
      .populate("applicationId", "status")
      .lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to send offer"),
    });
  }
};

/**
 * PATCH /api/offers/:id/accept - Accept offer (applicant only).
 */
exports.acceptOffer = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const offer = await Offer.findById(req.params.id)
      .populate("jobId", "title companyId facilityId")
      .populate("applicationId")
      .lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.status === "accepted") {
      const populated = await Offer.findById(req.params.id)
        .populate("jobId", "title")
        .populate("applicationId", "status")
        .lean();
      return res.status(200).json({ success: true, data: populated });
    }

    if (offer.status !== "sent") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept: offer is ${offer.status}`,
      });
    }

    const companyId = toIdString(offer.companyId);
    const applicationId = offer.applicationId?._id?.toString() || offer.applicationId?.toString();

    offer.status = "accepted";
    offer.acceptedAt = new Date();
    await Offer.findByIdAndUpdate(req.params.id, {
      status: "accepted",
      acceptedAt: offer.acceptedAt,
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Offer",
      targetId: offer._id.toString(),
      actionType: "offer_accepted",
      message: `Offer accepted by ${(req.user.name || req.user.email || "Applicant").toString().trim()}`,
      metadata: { candidateId: req.user._id.toString(), applicationId, jobId: offer.jobId?.toString() },
    });

    let assignment = await Assignment.findOne({
      applicationId,
      status: { $in: ["drafted", "offered", "accepted", "active"] },
    });
    if (!assignment) {
      assignment = await Assignment.create({
        companyId: offer.companyId,
        facilityId: offer.facilityId || offer.jobId?.facilityId,
        jobId: offer.jobId?._id || offer.jobId,
        applicationId,
        candidateId: req.user._id,
        recruiterId: offer.recruiterId,
        status: "accepted",
        acceptedAt: new Date(),
        startDate: offer.startDate,
        payRate: offer.payRate != null ? { payRate: offer.payRate, billRate: offer.billRate, currency: "USD", unit: "hour" } : undefined,
        shiftInfo: offer.scheduleNotes ? { scheduleNotes: offer.scheduleNotes } : undefined,
      });
      await activityLogService.logFromReq(req, {
        companyId,
        targetType: "Assignment",
        targetId: assignment._id.toString(),
        actionType: "assignment_created",
        message: `Assignment created via offer acceptance`,
        metadata: { candidateId: req.user._id.toString(), applicationId, offerId: offer._id.toString() },
      });
    }

    if (applicationId && isValidPipelineStatus("placed")) {
      await Application.findByIdAndUpdate(applicationId, {
        status: "placed",
        lastUpdatedBy: req.user._id,
        lastUpdatedAt: new Date(),
      });
    }

    const populated = await Offer.findById(req.params.id)
      .populate("jobId", "title")
      .populate("applicationId", "status")
      .lean();
    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to accept offer"),
    });
  }
};

/**
 * PATCH /api/offers/:id/decline - Decline offer (applicant only).
 */
exports.declineOffer = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (offer.status !== "sent") {
      return res.status(400).json({
        success: false,
        message: `Cannot decline: offer is ${offer.status}`,
      });
    }

    offer.status = "declined";
    offer.declinedAt = new Date();
    await offer.save();

    const companyId = toIdString(offer.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Offer",
      targetId: offer._id.toString(),
      actionType: "offer_declined",
      message: `Offer declined by ${(req.user.name || req.user.email || "Applicant").toString().trim()}`,
      metadata: { candidateId: req.user._id.toString() },
    });

    const populated = await Offer.findById(offer._id)
      .populate("jobId", "title")
      .populate("applicationId", "status")
      .lean();
    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to decline offer"),
    });
  }
};

/**
 * PATCH /api/offers/:id/withdraw - Withdraw offer (recruiter/owner).
 */
exports.withdrawOffer = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const hasAccess = await ensureCompanyAccess(req.user, toIdString(offer.companyId));
    if (!hasAccess) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (!["draft", "sent"].includes(offer.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw: offer is ${offer.status}`,
      });
    }

    offer.status = "withdrawn";
    offer.withdrawnAt = new Date();
    await offer.save();

    const companyId = toIdString(offer.companyId);
    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Offer",
      targetId: offer._id.toString(),
      actionType: "offer_withdrawn",
      message: `Offer withdrawn by ${(req.user.name || req.user.email || "Recruiter").toString().trim()}`,
      metadata: { candidateId: offer.candidateId?.toString() },
    });

    const populated = await Offer.findById(offer._id)
      .populate("jobId", "title")
      .populate("applicationId", "status")
      .lean();
    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to withdraw offer"),
    });
  }
};
