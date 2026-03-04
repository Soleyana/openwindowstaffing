/**
 * Contract controller.
 * Recruiter/owner: create, send. Candidate: view, sign, download. Both: get by id (scoped).
 */
const Contract = require("../models/Contract");
const Offer = require("../models/Offer");
const User = require("../models/User");
const { hasCompanyAccess } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const emailService = require("../services/emailService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { getClientUrl } = require("../config/env");

function toIdString(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

async function ensureCompanyAccess(user, companyId) {
  const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
  return !!allowed;
}

function buildDefaultContractHtml(offer) {
  const jobTitle = offer.jobId?.title || "Position";
  const companyName = offer.companyId?.name || "Company";
  const payRate = offer.payRate != null ? `$${offer.payRate}/hr` : "As agreed";
  const startDate = offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "To be determined";
  const scheduleNotes = offer.scheduleNotes || "Per schedule provided by facility";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Placement Contract</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem;">
  <h1>Placement Agreement</h1>
  <p><strong>Position:</strong> ${escapeHtml(jobTitle)}</p>
  <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
  <p><strong>Pay Rate:</strong> ${escapeHtml(String(payRate))}</p>
  <p><strong>Start Date:</strong> ${escapeHtml(startDate)}</p>
  <p><strong>Schedule:</strong> ${escapeHtml(scheduleNotes)}</p>
  <hr/>
  <p>By signing below, you agree to the terms of this placement agreement.</p>
</body>
</html>
  `.trim();
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /api/contracts - List contracts (recruiter/owner, company-scoped).
 */
exports.listContracts = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { companyId, offerId, candidateId } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId required" });
    }

    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const query = { companyId };
    if (offerId) query.offerId = offerId;
    if (candidateId) query.candidateId = candidateId;

    const contracts = await Contract.find(query)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch contracts"),
    });
  }
};

/**
 * GET /api/contracts/me - Applicant's own contracts.
 */
exports.getMyContracts = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const contracts = await Contract.find({ candidateId: req.user._id })
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch contracts"),
    });
  }
};

/**
 * POST /api/contracts - Create contract from offer (recruiter/owner).
 */
exports.createContract = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const { offerId, contractHtml } = req.body;
    if (!offerId) {
      return res.status(400).json({ success: false, message: "offerId required" });
    }

    const offer = await Offer.findById(offerId)
      .populate("jobId", "title")
      .populate("companyId", "name")
      .lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const companyId = toIdString(offer.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    if (offer.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Contract can only be created from an accepted offer",
      });
    }

    const existing = await Contract.findOne({ offerId });
    if (existing) {
      const populated = await Contract.findById(existing._id)
        .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
        .populate("companyId", "name")
        .lean();
      return res.status(200).json({ success: true, data: populated });
    }

    const html = contractHtml && String(contractHtml).trim()
      ? String(contractHtml)
      : buildDefaultContractHtml(offer);

    const contract = await Contract.create({
      companyId: offer.companyId,
      offerId: offer._id,
      candidateId: offer.candidateId,
      contractHtml: html,
      status: "draft",
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Contract",
      targetId: contract._id.toString(),
      actionType: "created",
      message: `Contract created for offer`,
      metadata: { offerId: offer._id.toString(), candidateId: toIdString(offer.candidateId) },
    });

    const populated = await Contract.findById(contract._id)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create contract"),
    });
  }
};

/**
 * PATCH /api/contracts/:id/send - Send contract link to candidate (recruiter/owner).
 */
exports.sendContract = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Recruiters and owners only" });
    }

    const contract = await Contract.findById(req.params.id)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .lean();
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    const companyId = toIdString(contract.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (contract.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Contract has already been sent",
      });
    }

    await Contract.updateOne(
      { _id: contract._id },
      { $set: { status: "sent", sentAt: new Date() } }
    );

    const baseUrl = getClientUrl();
    const signUrl = `${baseUrl}/contract/${contract._id}/sign`;

    const candidate = await User.findById(contract.candidateId)
      .select("email name")
      .lean();
    if (candidate?.email) {
      await emailService.sendContractToCandidate(
        candidate.email,
        candidate.name,
        contract.offerId?.jobId?.title || "Placement",
        signUrl
      );
    }

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Contract",
      targetId: contract._id.toString(),
      actionType: "contract_sent",
      message: `Contract sent to candidate`,
      metadata: { candidateId: toIdString(contract.candidateId) },
    });

    const updated = await Contract.findById(contract._id)
      .populate("offerId", "payRate startDate")
      .populate("jobId", "title")
      .populate("companyId", "name")
      .lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to send contract"),
    });
  }
};

/**
 * GET /api/contracts/:id - Get contract (candidate or recruiter with company access).
 */
exports.getContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    if (req.user.role === ROLES.APPLICANT) {
      if (contract.candidateId?.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
    } else if (STAFF_ROLES.includes(req.user.role)) {
      const hasAccess = await ensureCompanyAccess(req.user, toIdString(contract.companyId));
      if (!hasAccess) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch contract"),
    });
  }
};

/**
 * POST /api/contracts/:id/sign - Sign contract (candidate only).
 */
exports.signContract = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const { signatureName, consent } = req.body;
    if (!signatureName || typeof signatureName !== "string" || !signatureName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type your full legal name to sign",
      });
    }
    if (consent !== true) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the terms before signing",
      });
    }

    const contract = await Contract.findById(req.params.id)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    if (contract.candidateId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    if (contract.status === "signed") {
      const updated = await Contract.findById(contract._id)
        .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
        .populate("companyId", "name")
        .lean();
      return res.status(200).json({ success: true, data: updated });
    }

    if (contract.status !== "sent") {
      return res.status(400).json({
        success: false,
        message: "Contract is not available for signing",
      });
    }

    const signedHtml = buildSignedSnapshot(contract.contractHtml, {
      signatureName: signatureName.trim(),
      signedAt: new Date().toISOString(),
    });

    await Contract.updateOne(
      { _id: contract._id },
      {
        $set: {
          status: "signed",
          signedAt: new Date(),
          signatureName: signatureName.trim(),
          signatureIp: req.ip || req.connection?.remoteAddress,
          signatureUserAgent: req.get?.("user-agent") || "",
          signedHtmlSnapshot: signedHtml,
        },
      }
    );

    await activityLogService.logFromReq(req, {
      companyId: toIdString(contract.companyId),
      targetType: "Contract",
      targetId: contract._id.toString(),
      actionType: "contract_signed",
      message: `Contract signed by ${signatureName.trim()}`,
      metadata: { candidateId: req.user._id.toString() },
    });

    const updated = await Contract.findById(contract._id)
      .populate({ path: "offerId", populate: { path: "jobId", select: "title" } })
      .populate("companyId", "name")
      .lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to sign contract"),
    });
  }
};

function buildSignedSnapshot(contractHtml, { signatureName, signedAt }) {
  const sigBlock = `
<hr/>
<p><strong>Signed by:</strong> ${escapeHtml(signatureName)}</p>
<p><strong>Date:</strong> ${escapeHtml(signedAt)}</p>
  `.trim();
  const endBody = contractHtml.lastIndexOf("</body>");
  if (endBody >= 0) {
    return contractHtml.slice(0, endBody) + sigBlock + "\n</body></html>";
  }
  return contractHtml + sigBlock;
}

/**
 * GET /api/contracts/:id/download - Download signed artifact (candidate or recruiter with access).
 */
exports.downloadContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).lean();

    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    if (req.user.role === ROLES.APPLICANT) {
      if (contract.candidateId?.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
    } else if (STAFF_ROLES.includes(req.user.role)) {
      const hasAccess = await ensureCompanyAccess(req.user, toIdString(contract.companyId));
      if (!hasAccess) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const html = contract.status === "signed"
      ? (contract.signedHtmlSnapshot || contract.contractHtml)
      : contract.contractHtml;

    if (!html) {
      return res.status(404).json({ success: false, message: "No contract content available" });
    }

    const filename = `contract-${contract._id}-${contract.status === "signed" ? "signed" : "draft"}.html`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(html);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to download contract"),
    });
  }
};
