const CandidateDocument = require("../models/CandidateDocument");
const CandidateProfile = require("../models/CandidateProfile");
const path = require("path");
const fs = require("fs");
const { ROLES } = require("../constants/roles");
const candidateService = require("../services/candidateService");
const storageService = require("../services/storageService");
const activityLogService = require("../services/activityLogService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { DOCUMENT_TYPES } = require("../models/CandidateDocument");

const uploadsDir = path.join(__dirname, "..", "uploads");

/**
 * POST /api/candidates/me/documents - Applicant uploads document.
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const { type, expiresAt } = req.body;
    if (!type || !DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${DOCUMENT_TYPES.join(", ")}`,
      });
    }

    const userId = req.user._id.toString();
    let fileUrl;
    let fileKey;
    let storageProvider = "local";

    if (storageService.isCloudStorage()) {
      const result = await storageService.upload(req.file.buffer, req.file.originalname);
      fileUrl = result.url;
      fileKey = result.key;
      storageProvider = process.env.STORAGE_ENDPOINT?.includes("r2") ? "r2" : "s3";
    } else {
      fileUrl = req.file.filename || path.basename(req.file.path || "");
    }

    const doc = await CandidateDocument.create({
      userId: req.user._id,
      type,
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      fileKey: fileKey || undefined,
      storageProvider,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    await activityLogService.log({
      actorUserId: req.user._id,
      targetType: "Document",
      targetId: doc._id.toString(),
      actionType: "created",
      message: `Document ${type} uploaded`,
      metadata: { userId },
      req,
    });

    res.status(201).json({ success: true, data: doc.toObject() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to upload document"),
    });
  }
};

/**
 * PATCH /api/documents/:docId/verify - Recruiter verifies/rejects document.
 */
exports.verifyDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { verifiedStatus, notes } = req.body;

    const normalized = String(verifiedStatus || "").toLowerCase();
    const valid = ["pending", "verified", "rejected"].includes(normalized);
    if (!verifiedStatus || !valid) {
      return res.status(400).json({
        success: false,
        message: "verifiedStatus must be one of: pending, verified, rejected",
      });
    }

    const doc = await CandidateDocument.findById(docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const candidateIds = await candidateService.getAccessibleCandidateIds(req.user);
    if (!candidateIds.includes(doc.userId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    doc.verifiedStatus = normalized;
    doc.verifiedBy = req.user._id;
    doc.verifiedAt = new Date();
    if (notes !== undefined) doc.notes = notes;
    if (req.body.rejectReason !== undefined) doc.rejectReason = req.body.rejectReason;
    await doc.save();

    const docType = doc.type || "Document";
    const humanMessage = normalized === "verified" ? `${docType} verified` : `${docType} rejected`;
    const companyIdForLog = doc.companyId?.toString() || null;
    await activityLogService.logFromReq(req, {
      companyId: companyIdForLog,
      targetType: "CandidateDocument",
      targetId: docId,
      actionType: normalized === "verified" ? "document_verified" : "document_rejected",
      message: humanMessage,
      metadata: { userId: doc.userId.toString(), docType },
    });

    res.status(200).json({ success: true, data: doc.toObject() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to verify document"),
    });
  }
};

/**
 * GET /api/documents/:docId/download - Authorized download (audited).
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await CandidateDocument.findById(docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const isOwner = doc.userId.toString() === req.user._id.toString();
    const candidateIds = await candidateService.getAccessibleCandidateIds(req.user);
    const canAccess = isOwner || candidateIds.includes(doc.userId.toString());

    if (!canAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await activityLogService.logFromReq(req, {
      targetType: "Document",
      targetId: docId,
      actionType: "downloaded",
      message: "Document downloaded",
      metadata: { userId: doc.userId.toString() },
    });

    if (doc.storageProvider !== "local" && doc.fileKey) {
      const stream = await storageService.getStream(doc.fileKey);
      if (stream) {
        res.setHeader("Content-Type", stream.ContentType || "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${doc.type}-${docId}.pdf"`);
        return stream.Body.pipe(res);
      }
    }

    const safeName = path.basename(doc.fileUrl || "").replace(/\.\./g, "");
    const filePath = path.join(uploadsDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.type}-${docId}.pdf"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to download document"),
    });
  }
};
