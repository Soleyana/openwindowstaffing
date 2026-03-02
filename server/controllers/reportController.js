/**
 * Listing reports - company-scoped KPIs and job analytics
 */
const mongoose = require("mongoose");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { getAccessibleCompanyIds } = require("../services/companyAccessService");
const { ROLES } = require("../constants/roles");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const logger = require("../utils/logger");

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function escapeCsv(s) {
  if (s == null) return "";
  const str = String(s);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/reports/listings
 * Query: companyId, from, to, jobId, facilityId, status
 * Company-scoped: recruiter/owner only
 */
exports.getListingsReport = async (req, res) => {
  try {
    const { companyId, from, to, jobId, facilityId, status } = req.query;

    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    let filterCompanyId = companyId ? toObjectId(companyId) : null;
    if (filterCompanyId && !companyIds.includes(filterCompanyId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied to this company" });
    }
    const effectiveCompanyIds = filterCompanyId ? [filterCompanyId] : companyIds;

    const jobMatch = {};
    if (effectiveCompanyIds.length > 0) {
      jobMatch.companyId = { $in: effectiveCompanyIds };
    } else if (req.user.role === ROLES.OWNER) {
      jobMatch.companyId = { $exists: true };
    } else {
      jobMatch.createdBy = req.user._id;
    }
    if (jobId) jobMatch._id = toObjectId(jobId);
    if (facilityId) jobMatch.facilityId = toObjectId(facilityId);
    if (status) jobMatch.status = status;
    if (from || to) {
      jobMatch.createdAt = {};
      if (from) jobMatch.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        jobMatch.createdAt.$lte = d;
      }
    }

    const jobs = await Job.find(jobMatch)
      .populate("createdBy", "name email")
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = jobs.map((j) => j._id);

    const appCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    const appMap = Object.fromEntries(appCounts.map((a) => [a._id.toString(), a.count]));

    const totalListings = jobs.length;
    const activeListings = jobs.filter((j) => j.status === "open").length;
    const expiredListings = jobs.filter((j) => j.status === "expired" || (j.expiresAt && new Date(j.expiresAt) < new Date())).length;
    const totalApplications = Object.values(appMap).reduce((s, c) => s + c, 0);
    const conversionRate = totalListings > 0 ? ((totalApplications / totalListings) * 100).toFixed(1) : "0";

    const rows = jobs.map((j) => ({
      _id: j._id,
      title: j.title,
      company: j.companyId?.name || j.company || "—",
      status: j.status,
      applicationsCount: appMap[j._id.toString()] || 0,
      createdAt: j.createdAt,
      createdBy: j.createdBy?.name || j.createdBy?.email || "—",
    }));

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalListings,
          activeListings,
          expiredListings,
          totalApplications,
          conversionRate,
        },
        rows,
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, "Listing report error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to load report"),
    });
  }
};

/**
 * GET /api/reports/listings/export.csv
 * Same filters as getListingsReport, returns CSV
 */
exports.exportListingsReport = async (req, res) => {
  try {
    const { companyId, from, to, jobId, facilityId, status } = req.query;

    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    let filterCompanyId = companyId ? toObjectId(companyId) : null;
    if (filterCompanyId && !companyIds.includes(filterCompanyId.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const effectiveCompanyIds = filterCompanyId ? [filterCompanyId] : companyIds;

    const jobMatch = {};
    if (effectiveCompanyIds.length > 0) {
      jobMatch.companyId = { $in: effectiveCompanyIds };
    } else if (req.user.role === ROLES.OWNER) {
      jobMatch.companyId = { $exists: true };
    } else {
      jobMatch.createdBy = req.user._id;
    }
    if (jobId) jobMatch._id = toObjectId(jobId);
    if (facilityId) jobMatch.facilityId = toObjectId(facilityId);
    if (status) jobMatch.status = status;
    if (from || to) {
      jobMatch.createdAt = {};
      if (from) jobMatch.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        jobMatch.createdAt.$lte = d;
      }
    }

    const jobs = await Job.find(jobMatch)
      .populate("createdBy", "name email")
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const jobIds = jobs.map((j) => j._id);
    const appCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    const appMap = Object.fromEntries(appCounts.map((a) => [a._id.toString(), a.count]));

    const headers = ["Job Title", "Company", "Status", "Applications", "Created At", "Created By"];
    const rows = jobs.map((j) => [
      j.title,
      j.companyId?.name || j.company || "—",
      j.status || "—",
      appMap[j._id.toString()] || 0,
      j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 19).replace("T", " ") : "—",
      j.createdBy?.name || j.createdBy?.email || "—",
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="listing-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.write("\uFEFF");
    res.write(headers.map(escapeCsv).join(",") + "\n");
    for (const row of rows) {
      res.write(row.map(escapeCsv).join(",") + "\n");
    }
    res.end();
  } catch (error) {
    logger.error({ err: error.message }, "Listing report export error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to export"),
    });
  }
};
