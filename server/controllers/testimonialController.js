const crypto = require("crypto");
const Testimonial = require("../models/Testimonial");
const Company = require("../models/Company");
const activityLogService = require("../services/activityLogService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const logger = require("../utils/logger");

const IP_HASH_SALT = process.env.TESTIMONIAL_IP_SALT || "ow-testimonial-salt";

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + IP_HASH_SALT).digest("hex").slice(0, 64);
}

function trim(str, max) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, max || 999);
}

/**
 * POST /api/testimonials/submit - Public submit (no auth).
 */
exports.submit = async (req, res) => {
  try {
    const { companyId, authorName, authorRole, rating, title, message, email, consentToPublish, website } = req.body;

    if (website && String(website).trim()) {
      return res.status(204).send();
    }

    if (!consentToPublish) {
      return res.status(400).json({ success: false, message: "You must consent to publish your review." });
    }

    const name = trim(authorName, 80);
    if (!name) {
      return res.status(400).json({ success: false, message: "Author name is required." });
    }

    const msg = trim(message, 1200);
    if (!msg) {
      return res.status(400).json({ success: false, message: "Review message is required." });
    }
    if (msg.length < 20) {
      return res.status(400).json({ success: false, message: "Review message must be at least 20 characters." });
    }

    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company is required." });
    }

    const company = await Company.findById(companyId).lean();
    if (!company || company.status !== "active") {
      return res.status(400).json({ success: false, message: "Invalid company." });
    }

    const ipHash = hashIp(req.ip || req.connection?.remoteAddress);
    const userAgent = (req.get("user-agent") || "").slice(0, 500);

    const testimonial = await Testimonial.create({
      companyId,
      authorName: name,
      authorRole: trim(authorRole, 80),
      rating: r,
      title: trim(title, 120),
      message: msg,
      source: "public_form",
      status: "pending",
      consentToPublish: true,
      email: email ? trim(email, 200) : undefined,
      ipHash,
      userAgent,
    });

    activityLogService.log({
      req,
      companyId,
      targetType: "Testimonial",
      targetId: testimonial._id.toString(),
      actionType: "testimonial_submitted",
      message: `Testimonial submitted for ${company.name}`,
      metadata: { rating: r },
    }).catch(() => {});

    res.status(201).json({ success: true, data: { _id: testimonial._id } });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial submit error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to submit review"),
    });
  }
};

/**
 * GET /api/testimonials?companyId=&limit=&offset= - Public list approved only.
 */
exports.list = async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const query = { status: "approved" };
    if (companyId) query.companyId = companyId;

    const [rows, total] = await Promise.all([
      Testimonial.find(query)
        .select("authorName authorRole rating title message createdAt approvedAt")
        .sort({ approvedAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Testimonial.countDocuments(query),
    ]);

    res.status(200).json({ success: true, data: { rows, total } });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial list error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to load reviews"),
    });
  }
};

/**
 * GET /api/testimonials/admin?companyId=&status=&limit=&offset= - Admin moderation.
 */
exports.adminList = async (req, res) => {
  try {
    const companyId = req.companyIdResolved || req.query.companyId;
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required." });
    }

    const query = { companyId };
    if (status && ["pending", "approved", "rejected", "hidden"].includes(status)) {
      query.status = status;
    }

    const [rows, total] = await Promise.all([
      Testimonial.find(query)
        .select("authorName authorRole rating title message status createdAt approvedAt rejectedReason")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Testimonial.countDocuments(query),
    ]);

    res.status(200).json({ success: true, data: { rows, total } });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial admin list error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to load reviews"),
    });
  }
};

async function getTestimonialAndCheckAccess(req, testimonialId) {
  const testimonial = await Testimonial.findById(testimonialId).lean();
  if (!testimonial) return { err: 404, message: "Testimonial not found" };
  const { allowed, company, membership } = await require("../services/companyAccessService").hasCompanyAccess(
    req.user._id.toString(),
    testimonial.companyId.toString()
  );
  if (!allowed || !company) return { err: 403, message: "Access denied" };
  const isOwner = company.ownerId?.toString() === req.user._id.toString();
  const isAdmin = membership && ["owner", "admin"].includes(membership.role);
  if (!isOwner && !isAdmin) return { err: 403, message: "Only company owner or admin can moderate" };
  return { testimonial };
}

/**
 * PATCH /api/testimonials/:id/approve
 */
exports.approve = async (req, res) => {
  try {
    const result = await getTestimonialAndCheckAccess(req, req.params.id);
    if (result.err) {
      return res.status(result.err).json({ success: false, message: result.message });
    }
    const { testimonial } = result;

    const updated = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { status: "approved", approvedAt: new Date(), rejectedReason: null },
      { new: true }
    ).lean();

    activityLogService.logFromReq(req, {
      companyId: testimonial.companyId,
      targetType: "Testimonial",
      targetId: testimonial._id.toString(),
      actionType: "testimonial_approved",
      message: `Testimonial approved`,
    }).catch(() => {});

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial approve error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to approve"),
    });
  }
};

/**
 * PATCH /api/testimonials/:id/reject
 */
exports.reject = async (req, res) => {
  try {
    const result = await getTestimonialAndCheckAccess(req, req.params.id);
    if (result.err) {
      return res.status(result.err).json({ success: false, message: result.message });
    }
    const { testimonial } = result;
    const reason = trim(req.body.reason, 300);

    await Testimonial.findByIdAndUpdate(req.params.id, {
      status: "rejected",
      rejectedReason: reason,
    });

    activityLogService.logFromReq(req, {
      companyId: testimonial.companyId,
      targetType: "Testimonial",
      targetId: testimonial._id.toString(),
      actionType: "testimonial_rejected",
      message: `Testimonial rejected`,
      metadata: { reason },
    }).catch(() => {});

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial reject error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to reject"),
    });
  }
};

/**
 * PATCH /api/testimonials/:id/hide
 */
exports.hide = async (req, res) => {
  try {
    const result = await getTestimonialAndCheckAccess(req, req.params.id);
    if (result.err) {
      return res.status(result.err).json({ success: false, message: result.message });
    }
    const { testimonial } = result;

    await Testimonial.findByIdAndUpdate(req.params.id, { status: "hidden" });

    activityLogService.logFromReq(req, {
      companyId: testimonial.companyId,
      targetType: "Testimonial",
      targetId: testimonial._id.toString(),
      actionType: "testimonial_hidden",
      message: `Testimonial hidden`,
    }).catch(() => {});

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial hide error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to hide"),
    });
  }
};

/**
 * DELETE /api/testimonials/:id - Owner/Admin only
 */
exports.deleteTestimonial = async (req, res) => {
  try {
    const result = await getTestimonialAndCheckAccess(req, req.params.id);
    if (result.err) {
      return res.status(result.err).json({ success: false, message: result.message });
    }
    const { testimonial } = result;

    await Testimonial.findByIdAndDelete(req.params.id);

    activityLogService.logFromReq(req, {
      companyId: testimonial.companyId,
      targetType: "Testimonial",
      targetId: testimonial._id.toString(),
      actionType: "testimonial_deleted",
      message: `Testimonial deleted`,
    }).catch(() => {});

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ err: error.message }, "Testimonial delete error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to delete testimonial"),
    });
  }
};
