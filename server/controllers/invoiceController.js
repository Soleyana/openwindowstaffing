/**
 * Invoice request workflow - company-scoped, sends email to billing
 */
const InvoiceRequest = require("../models/InvoiceRequest");
const { hasCompanyAccess } = require("../services/companyAccessService");
const emailService = require("../services/emailService");
const { CONTACT_EMAIL } = require("../config/env");
const activityLogService = require("../services/activityLogService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

/**
 * POST /api/invoices/request
 * Body: { companyId, message? }
 * Sends email to billing + logs activity
 */
exports.requestInvoice = async (req, res) => {
  try {
    const { companyId, message } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId is required" });
    }

    const { allowed, company } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }

    const billingEmail = company?.billingEmail || CONTACT_EMAIL;
    const companyName = company?.name || "Company";
    const requesterName = req.user?.name || req.user?.email || "User";

    const record = await InvoiceRequest.create({
      companyId: toObjectId(companyId),
      requesterId: req.user._id,
      message: (message || "").trim().slice(0, 2000),
      status: "pending",
    });

    const html = `
      <p><strong>Invoice Request</strong></p>
      <p>Company: ${escapeHtml(companyName)} (${companyId})</p>
      <p>Requested by: ${escapeHtml(requesterName)} (${req.user.email})</p>
      ${(message || "").trim() ? `<p>Message:</p><p>${escapeHtml(message.trim())}</p>` : ""}
      <p>— ${escapeHtml(process.env.DEFAULT_COMPANY || "Staffing Platform")}</p>
    `;

    await emailService.sendEmail(billingEmail, `Invoice request: ${companyName}`, html, {
      replyTo: req.user?.email,
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "InvoiceRequest",
      targetId: record._id.toString(),
      actionType: "invoice_requested",
      message: "Invoice requested",
      metadata: { billingEmail, noteLength: (message || "").trim().length },
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "InvoiceRequest",
      targetId: record._id.toString(),
      actionType: "invoice_requested_email_sent",
      message: "Invoice request email sent to billing",
      metadata: { companyIdResolved: companyId, billingEmail },
    });

    res.status(201).json({
      success: true,
      message: "Invoice request submitted. We'll be in touch shortly.",
      data: { _id: record._id },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Invoice request error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to submit request"),
    });
  }
};

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
