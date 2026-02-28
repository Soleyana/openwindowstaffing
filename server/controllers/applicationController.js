const Application = require("../models/Application");
const Job = require("../models/Job");
const logger = require("../utils/logger");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const emailService = require("../services/emailService");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const { DEFAULT_STATUS } = require("../constants/applicationStatuses");
const { toApplicantStatus } = require("../services/applicationService");

exports.getAllApplications = async (req, res) => {
  try {
    let jobIds;
    if (req.user.role === ROLES.OWNER) {
      const allJobs = await Job.find({}).select("_id");
      jobIds = allJobs.map((j) => j._id);
    } else {
      const recruiterJobs = await Job.find({ createdBy: req.user._id }).select("_id");
      jobIds = recruiterJobs.map((j) => j._id);
    }

    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .lean();

    const data = applications.map((app) => ({
      ...app,
      jobTitle: app.jobId?.title || "—",
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch applications"),
    });
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const jobId = req.params.jobId || req.body.jobId;
    const {
      firstName,
      lastName,
      email,
      phone,
      street,
      address,
      city,
      state,
      zip,
      authorizedToWork,
      requireVisaSponsorship,
      highestDegree,
      schoolName,
      graduationYear,
      gpa,
      yearsExperience,
      currentJobTitle,
      currentEmployer,
      hasLicense,
      licenseType,
      licenseNumber,
      licenseState,
      certifications,
      specialty,
      shiftPreference,
      availableStartDate,
      willingToTravel,
      message,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }
    if (!firstName?.trim()) {
      return res.status(400).json({ success: false, message: "First name is required" });
    }
    if (!lastName?.trim()) {
      return res.status(400).json({ success: false, message: "Last name is required" });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume file is required" });
    }

    const resumeUrl = `resumes/${req.file.filename}`;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const applicantId = req.user?._id || null;
    const addressValue = address || street || "";

    const application = await Application.create({
      jobId,
      applicant: applicantId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: addressValue,
      street: street || addressValue,
      city: city || "",
      state: state || "",
      zip: zip || "",
      authorizedToWork,
      requireVisaSponsorship,
      highestDegree,
      schoolName,
      graduationYear,
      gpa,
      yearsExperience,
      currentJobTitle,
      currentEmployer,
      hasLicense,
      licenseType,
      licenseNumber,
      licenseState,
      certifications,
      specialty,
      shiftPreference,
      availableStartDate,
      willingToTravel,
      message,
      resumeUrl,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to submit application"),
    });
  }
};

exports.createApplication = async (req, res) => {
  try {
    const { jobId, coverMessage } = req.body;
    const applicantId = req.user._id;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({
        success: false,
        message: "Only job seekers can apply to jobs",
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const existing = await Application.findOne({ jobId, applicant: applicantId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    const parts = (req.user.name || "Applicant").trim().split(/\s+/);
    const firstName = parts[0] || "Applicant";
    const lastName = parts.slice(1).join(" ") || "—";

    const application = await Application.create({
      jobId,
      applicant: applicantId,
      firstName,
      lastName,
      email: req.user.email || "",
      phone: "—",
      message: coverMessage || "",
      status: "pending",
    });

    const populated = await Application.findById(application._id)
      .populate("jobId", "title company location")
      .populate("applicant", "name email");

    const applicantEmail = application.email || req.user?.email;
    if (applicantEmail) {
      emailService.sendApplicationConfirmation(
        applicantEmail,
        `${application.firstName} ${application.lastName}`.trim() || req.user?.name,
        job.title
      ).catch((err) => console.error("[Email] Application confirmation failed:", err?.message));
    }

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to submit application"),
    });
  }
};

exports.getApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applications for this job",
      });
    }

    const applications = await Application.find({ jobId })
      .populate("applicant", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch applications"),
    });
  }
};

function escapeCsv(val) {
  if (val == null || val === "") return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

exports.exportApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).select("title createdBy");
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    const isOwner = req.user.role === ROLES.OWNER;
    const ownsJob = job.createdBy && job.createdBy.toString() === req.user._id.toString();
    if (!isOwner && !ownsJob) {
      return res.status(403).json({ success: false, message: "Not authorized to export applications for this job" });
    }

    const applications = await Application.find({ jobId })
      .populate("applicant", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const headers = ["Name", "Email", "Phone", "Status", "Applied Date"];
    const rows = applications.map((app) => {
      const name = app.applicant?.name || [app.firstName, app.lastName].filter(Boolean).join(" ") || "—";
      const email = app.applicant?.email || app.email || "—";
      const phone = app.phone || "—";
      const status = app.status || "—";
      const date = app.createdAt ? new Date(app.createdAt).toISOString().slice(0, 10) : "—";
      return [name, email, phone, status, date];
    });

    const csvContent = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const filename = `applicants-${job.title?.replace(/[^a-z0-9]/gi, "-") || jobId}-${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to export applicants"),
    });
  }
};

exports.checkApplied = async (req, res) => {
  try {
    const { jobId } = req.params;
    const existing = await Application.findOne({ jobId, applicant: req.user._id });
    return res.status(200).json({
      success: true,
      applied: !!existing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to check application status"),
    });
  }
};

exports.getMyApplicationStats = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({
        success: false,
        message: "Only job seekers can view application stats",
      });
    }

    const applications = await Application.find({
      $or: [{ applicant: req.user._id }, { email: req.user.email }],
    }).lean();

    const totalApplications = applications.length;
    let applied = 0;
    let underReview = 0;
    let offer = 0;
    let placed = 0;
    let notSelected = 0;

    for (const a of applications) {
      const mapped = toApplicantStatus(a.status);
      if (mapped === "applied") applied++;
      else if (mapped === "under review") underReview++;
      else if (mapped === "offer") offer++;
      else if (mapped === "placed") placed++;
      else if (mapped === "not selected") notSelected++;
    }

    return res.status(200).json({
      totalApplications,
      applied,
      underReview,
      offer,
      placed,
      notSelected,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch stats"),
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({
        success: false,
        message: "Only job seekers can view their applications",
      });
    }

    const applications = await Application.find({
      $or: [{ applicant: req.user._id }, { email: req.user.email }],
    })
      .populate("jobId", "title company location jobType payRate")
      .sort({ createdAt: -1 })
      .lean();

    const data = applications.map((a) => ({
      ...a,
      job: a.jobId,
      status: toApplicantStatus(a.status),
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch applications"),
    });
  }
};

const { ALLOWED_STATUSES, isValidPipelineStatus } = require("../constants/applicationStatuses");

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !isValidPipelineStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const application = await Application.findById(id).select("+recruiterNotes");
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const job = await Job.findById(application.jobId || application.job);
    const isOwner = req.user.role === ROLES.OWNER;
    const ownsJob = job && job.createdBy.toString() === req.user._id.toString();
    if (!job || (!isOwner && !ownsJob)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this application",
      });
    }

    application.status = status;
    application.lastUpdatedBy = req.user._id;
    application.lastUpdatedAt = new Date();
    await application.save();

    if (application.email) {
      const applicantName = [application.firstName, application.lastName].filter(Boolean).join(" ").trim();
      emailService.sendStatusChangeNotification(
        application.email,
        applicantName || "Applicant",
        job.title,
        status
      ).catch((err) => logger.error({ err: err?.message }, "[Email] Status change notification failed"));
    }

    return res.status(200).json({
      success: true,
      message: "Status updated",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update status"),
    });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only staff can view their posted jobs",
      });
    }

    const jobs = await Job.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const count = await Application.countDocuments({ jobId: job._id });
        return {
          ...job.toObject(),
          applicationCount: count,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: jobsWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch jobs"),
    });
  }
};
