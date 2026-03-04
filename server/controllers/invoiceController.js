/**
 * Invoice request workflow - company-scoped, sends email to billing.
 * Invoice generation from approved timesheets.
 */
const InvoiceRequest = require("../models/InvoiceRequest");
const Invoice = require("../models/Invoice");
const Timesheet = require("../models/Timesheet");
const Assignment = require("../models/Assignment");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const activityLogService = require("../services/activityLogService");
const emailService = require("../services/emailService");
const { CONTACT_EMAIL } = require("../config/env");
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
      requestId: req.requestId,
      caller: "invoice_request",
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

function toIdString(val) {
  if (!val) return null;
  if (val._id) return val._id.toString();
  return val.toString();
}

async function ensureCompanyAccess(user, companyId) {
  const id = toIdString(companyId);
  if (!id) return false;
  const { allowed } = await hasCompanyAccess(user._id.toString(), id);
  return !!allowed;
}

async function getNextInvoiceNumber(companyId) {
  const last = await Invoice.findOne({ companyId }).sort({ invoiceNumber: -1 }).select("invoiceNumber").lean();
  const num = last?.invoiceNumber ? parseInt(String(last.invoiceNumber).replace(/\D/g, ""), 10) || 0 : 0;
  return `INV-${String(num + 1).padStart(4, "0")}`;
}

function computeTotalHours(entries) {
  if (!entries || !Array.isArray(entries)) return 0;
  return entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
}

/**
 * POST /api/invoices/generate - Create draft invoice from approved timesheets.
 * Body: { companyId, from, to }
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { companyId, from, to } = req.body;
    if (!companyId || !from || !to) {
      return res.status(400).json({ success: false, message: "companyId, from, and to are required" });
    }
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return res.status(400).json({ success: false, message: "from must be before to" });
    }

    const timesheets = await Timesheet.find({
      companyId,
      status: "approved",
      periodStart: { $lte: toDate },
      periodEnd: { $gte: fromDate },
    }).populate("assignmentId").lean();

    if (timesheets.length === 0) {
      return res.status(400).json({ success: false, message: "No approved timesheets in this date range" });
    }

    const assignmentIds = [...new Set(timesheets.map((t) => t.assignmentId?._id?.toString()).filter(Boolean))];
    const assignments = await Assignment.find({ _id: { $in: assignmentIds } }).lean();
    const assignMap = new Map(assignments.map((a) => [a._id.toString(), a]));

    const lineItems = [];
    const usedTimesheetIds = new Set();

    for (const ts of timesheets) {
      const assign = ts.assignmentId && assignMap.get(ts.assignmentId._id?.toString?.() || ts.assignmentId?.toString?.());
      const rate = assign?.payRate?.billRate ?? assign?.payRate?.payRate ?? 0;
      const hours = computeTotalHours(ts.entries);
      if (hours <= 0) continue;
      const amount = Math.round(hours * rate * 100) / 100;
      lineItems.push({
        assignmentId: ts.assignmentId?._id || ts.assignmentId,
        candidateId: ts.candidateId,
        timesheetIds: [ts._id],
        description: `Timesheet ${new Date(ts.periodStart).toLocaleDateString()} – ${new Date(ts.periodEnd).toLocaleDateString()}`,
        hours,
        rate,
        amount,
      });
      usedTimesheetIds.add(ts._id.toString());
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ success: false, message: "No billable hours in approved timesheets" });
    }

    const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
    const total = Math.round(subtotal * 100) / 100;

    const invoiceNumber = await getNextInvoiceNumber(companyId);
    const invoice = await Invoice.create({
      companyId,
      periodStart: fromDate,
      periodEnd: toDate,
      invoiceNumber,
      status: "draft",
      lineItems,
      subtotal,
      total,
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Invoice",
      targetId: invoice._id.toString(),
      actionType: "invoice_generated",
      message: `Invoice ${invoiceNumber} generated from ${lineItems.length} timesheet(s)`,
      metadata: { total, timesheetCount: timesheets.length },
    });

    const populated = await Invoice.findById(invoice._id)
      .populate("companyId", "name")
      .lean();
    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    logger.error({ err: error.message }, "Invoice generate error");
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to generate invoice"),
    });
  }
};

/**
 * GET /api/invoices - List invoices (company-scoped).
 */
exports.listInvoices = async (req, res) => {
  try {
    const { companyId, status, from, to } = req.query;
    let companyIds = [];
    if (companyId) {
      const hasAccess = await ensureCompanyAccess(req.user, companyId);
      if (!hasAccess) return res.status(403).json({ success: false, message: "Access denied" });
      companyIds = [companyId];
    } else {
      companyIds = await getAccessibleCompanyIds(req.user._id.toString());
      if (companyIds.length === 0) return res.status(200).json({ success: true, data: [] });
    }

    const query = { companyId: { $in: companyIds } };
    if (status) query.status = status;
    if (from) query.periodEnd = { ...query.periodEnd, $gte: new Date(from) };
    if (to) query.periodStart = { ...query.periodStart, $lte: new Date(to) };

    const invoices = await Invoice.find(query)
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch invoices"),
    });
  }
};

/**
 * GET /api/invoices/:id - Get single invoice.
 */
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("companyId", "name")
      .populate("lineItems.candidateId", "name email")
      .populate("lineItems.assignmentId", "jobId")
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const hasAccess = await ensureCompanyAccess(req.user, invoice.companyId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Invoice not found" });
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch invoice"),
    });
  }
};

/**
 * POST /api/invoices/:id/issue - Set status to issued, send email.
 */
exports.issueInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("companyId", "name").lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const companyId = toIdString(invoice.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status !== "draft") {
      return res.status(400).json({ success: false, message: `Cannot issue: invoice is ${invoice.status}` });
    }

    await Invoice.findByIdAndUpdate(req.params.id, {
      status: "issued",
      issuedAt: new Date(),
      updatedAt: new Date(),
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Invoice",
      targetId: invoice._id.toString(),
      actionType: "invoice_issued",
      message: `Invoice ${invoice.invoiceNumber} issued`,
      metadata: { total: invoice.total },
    });

    const billingEmail = invoice.companyId?.billingEmail || CONTACT_EMAIL;
    if (billingEmail) {
      const html = `Invoice ${invoice.invoiceNumber} has been issued. Total: $${invoice.total?.toFixed(2) || "0.00"}.`;
      emailService.sendEmail(billingEmail, `Invoice ${invoice.invoiceNumber} issued`, html, { requestId: req.requestId, caller: "invoice_issued" }).catch(() => {});
    }

    const updated = await Invoice.findById(req.params.id).populate("companyId", "name").lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to issue invoice"),
    });
  }
};

/**
 * POST /api/invoices/:id/mark-paid - Owner/admin.
 */
exports.markPaidInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const companyId = toIdString(invoice.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.status !== "issued") {
      return res.status(400).json({ success: false, message: `Cannot mark paid: invoice is ${invoice.status}` });
    }

    await Invoice.findByIdAndUpdate(req.params.id, {
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Invoice",
      targetId: invoice._id.toString(),
      actionType: "invoice_paid",
      message: `Invoice ${invoice.invoiceNumber} marked paid`,
    });

    const timesheetIds = (invoice.lineItems || []).flatMap((li) => li.timesheetIds || []).filter(Boolean);
    for (const tsId of timesheetIds) {
      await activityLogService.logFromReq(req, {
        companyId,
        targetType: "Timesheet",
        targetId: tsId.toString(),
        actionType: "timesheet_paid",
        message: `Timesheet included in paid invoice ${invoice.invoiceNumber}`,
        metadata: { invoiceId: invoice._id.toString() },
      });
    }

    const updated = await Invoice.findById(req.params.id).populate("companyId", "name").lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to mark paid"),
    });
  }
};

/**
 * PATCH /api/invoices/:id - Update invoice (draft only). Issued/paid are immutable.
 */
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const companyId = toIdString(invoice.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Invoice not found" });

    if (invoice.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Cannot modify invoice: issued and paid invoices are immutable (current: ${invoice.status})`,
      });
    }

    const { lineItems } = req.body;
    if (lineItems !== undefined && !Array.isArray(lineItems)) {
      return res.status(400).json({ success: false, message: "lineItems must be an array" });
    }

    if (lineItems) {
      const subtotal = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
      const total = Math.round(subtotal * 100) / 100;
      await Invoice.findByIdAndUpdate(req.params.id, {
        lineItems,
        subtotal,
        total,
        updatedAt: new Date(),
      });
    }

    const updated = await Invoice.findById(req.params.id).populate("companyId", "name").lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update invoice"),
    });
  }
};

/**
 * GET /api/invoices/:id/export - CSV (default) or HTML (format=html|pdf).
 */
exports.exportInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("lineItems.candidateId", "name email")
      .populate("companyId", "name")
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    const companyId = toIdString(invoice.companyId);
    const hasAccess = await ensureCompanyAccess(req.user, companyId);
    if (!hasAccess) return res.status(404).json({ success: false, message: "Invoice not found" });

    const format = (req.query.format || "csv").toLowerCase();

    if (format === "html" || format === "pdf") {
      const html = buildInvoiceHtml(invoice);
      const filename = `invoice-${invoice.invoiceNumber}.html`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(html);
      return;
    }

    const rows = [
      ["Invoice", invoice.invoiceNumber, invoice.companyId?.name || ""],
      ["Period", new Date(invoice.periodStart).toLocaleDateString(), new Date(invoice.periodEnd).toLocaleDateString()],
      ["Status", invoice.status],
      [],
      ["Description", "Hours", "Rate", "Amount"],
      ...(invoice.lineItems || []).map((li) => [
        li.description || "",
        li.hours?.toFixed(1) || "0",
        li.rate?.toFixed(2) || "0",
        li.amount?.toFixed(2) || "0",
      ]),
      [],
      ["Subtotal", "", "", invoice.subtotal?.toFixed(2) || "0"],
      ["Total", "", "", invoice.total?.toFixed(2) || "0"],
    ];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = `invoice-${invoice.invoiceNumber}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to export invoice"),
    });
  }
};

function buildInvoiceHtml(invoice) {
  const companyName = escapeHtml(invoice.companyId?.name || "Company");
  const rows = (invoice.lineItems || []).map(
    (li) => `
    <tr>
      <td>${escapeHtml(li.description || "")}</td>
      <td style="text-align:right">${(li.hours ?? 0).toFixed(1)}</td>
      <td style="text-align:right">$${(li.rate ?? 0).toFixed(2)}</td>
      <td style="text-align:right">$${(li.amount ?? 0).toFixed(2)}</td>
    </tr>`
  ).join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.5rem; border-bottom: 1px solid #ddd; }
    th { text-align: left; }
    .total { font-weight: bold; text-align: right; margin-top: 1rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Invoice ${escapeHtml(invoice.invoiceNumber)}</h1>
  <p><strong>${companyName}</strong></p>
  <p>Period: ${new Date(invoice.periodStart).toLocaleDateString()} – ${new Date(invoice.periodEnd).toLocaleDateString()}</p>
  <p>Status: ${escapeHtml(invoice.status)}</p>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: $${(invoice.total ?? 0).toFixed(2)}</p>
</body>
</html>`;
}
