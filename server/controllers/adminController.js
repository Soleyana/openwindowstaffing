/**
 * Admin controller - platformAdmin only.
 */
const mongoose = require("mongoose");
const Company = require("../models/Company");
const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Assignment = require("../models/Assignment");
const Invoice = require("../models/Invoice");
const Timesheet = require("../models/Timesheet");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/admin/companies - List all companies (platformAdmin only).
 */
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({})
      .select("name legalName billingEmail status ownerId createdAt")
      .populate("ownerId", "name email")
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({ success: true, data: companies });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch companies"),
    });
  }
};

/**
 * GET /api/admin/system - System health + version (platformAdmin only).
 */
exports.getSystemInfo = async (req, res) => {
  try {
    let dbStatus = "disconnected";
    try {
      await mongoose.connection.db.admin().ping();
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }

    const version =
      process.env.RENDER_GIT_COMMIT ||
      process.env.COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      "dev";

    const counts = {};
    if (dbStatus === "connected") {
      try {
        const [companies, users, jobs, applications, assignments, invoices, timesheets] = await Promise.all([
          Company.countDocuments(),
          User.countDocuments(),
          Job.countDocuments(),
          Application.countDocuments(),
          Assignment.countDocuments(),
          Invoice.countDocuments(),
          Timesheet.countDocuments(),
        ]);
        counts.companies = companies;
        counts.users = users;
        counts.jobs = jobs;
        counts.applications = applications;
        counts.assignments = assignments;
        counts.invoices = invoices;
        counts.timesheets = timesheets;
      } catch (err) {
        counts.error = err.message || "Failed to fetch counts";
      }
    }

    const enableBackgroundJobs = process.env.ENABLE_BACKGROUND_JOBS === "true" || process.env.ENABLE_BACKGROUND_JOBS === "1";
    const emailDisabled = process.env.EMAIL_DISABLED === "true" || process.env.EMAIL_DISABLED === "1";

    return res.status(200).json({
      success: true,
      data: {
        status: "ok",
        db: dbStatus,
        version,
        nodeEnv: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        counts,
        toggles: {
          ENABLE_BACKGROUND_JOBS: enableBackgroundJobs,
          EMAIL_DISABLED: emailDisabled,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch system info"),
    });
  }
};
