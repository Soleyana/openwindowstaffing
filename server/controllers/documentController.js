const CandidateDocument = require("../models/CandidateDocument");
const CandidateProfile = require("../models/CandidateProfile");
const path = require("path");
const fs = require("fs");
const { ROLES } = require("../constants/roles");
const candidateService = require("../services/candidateService");
const storageService = require("../services/storageService");
const activityLogService = require("../services/activityLogService");
const notificationService = require("../services/notificationService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { DOCUMENT_TYPES } = require("../models/CandidateDocument");

const uploadsDir = path.join(__dirname, "..", "uploads");

function sanitizeFilename(name) {
  if (typeof name !== "string") return "document";
  return name.replace(/["/\\:*?<>|]/g, "_").replace(/\s+/g, "_").slice(0, 200) || "document";
}

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

    await notificationService.create({
      userId: doc.userId,
      companyId: doc.companyId,
      type: normalized === "verified" ? "document_verified" : "document_rejected",
      title: humanMessage,
      body: normalized === "rejected" && doc.rejectReason ? doc.rejectReason : undefined,
      url: "/my-profile",
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
        res.setHeader("Content-Type", stream.ContentType || doc.mimeType || "application/octet-stream");
        const fname = sanitizeFilename(doc.fileName || `${doc.type}-${docId}`);
        res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
        return stream.Body.pipe(res);
      }
    }

    const safeName = path.basename(doc.fileUrl || "").replace(/\.\./g, "");
    const filePath = path.join(uploadsDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    const fname = sanitizeFilename(doc.fileName || `${doc.type}-${docId}`);
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to download document"),
    });
  }
};

/**
 * DELETE /api/documents/:docId - Applicant deletes own document.
 */
exports.deleteDocument = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const { docId } = req.params;
    const doc = await CandidateDocument.findById(docId);
    if (!doc || doc.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const actorName = (req.user.name || req.user.email || "Applicant").toString().trim();
    await activityLogService.logFromReq(req, {
      companyId: doc.companyId?.toString() || null,
      targetType: "CandidateDocument",
      targetId: docId,
      actionType: "document_deleted",
      message: `${doc.type || "Document"} deleted by ${actorName}`,
      metadata: { userId: doc.userId.toString(), docType: doc.type },
    });

    await storageService.deleteFile(doc.fileUrl, { fileKey: doc.fileKey, storageProvider: doc.storageProvider });
    await CandidateDocument.findByIdAndDelete(docId);

    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to delete document"),
    });
  }
};
