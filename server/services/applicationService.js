const Application = require("../models/Application");
const Job = require("../models/Job");
const { ROLES, STAFF_ROLES } = require("../constants/roles");
const {
  ALLOWED_STATUSES,
  isValidPipelineStatus,
  toApplicantStatus,
  toPipelineStatus,
} = require("../constants/applicationStatuses");

/** Get job IDs the user can access (owner: all, recruiter: own jobs + company membership jobs) */
async function getAccessibleJobIds(user) {
  if (user.role === ROLES.OWNER) {
    const jobs = await Job.find({}).select("_id");
    return jobs.map((j) => j._id);
  }
  const { getAccessibleCompanyIds } = require("./companyAccessService");
  const companyIds = await getAccessibleCompanyIds(user._id.toString());
  const jobs = await Job.find({
    $or: [
      { createdBy: user._id },
      ...(companyIds.length ? [{ companyId: { $in: companyIds } }] : []),
    ],
  }).select("_id");
  return jobs.map((j) => j._id);
}

/** Check if user can access an application (via job ownership, company membership, or owner role) */
async function canAccessApplication(user, applicationId) {
  const app = await Application.findById(applicationId)
    .select("jobId companyId")
    .populate("jobId", "createdBy companyId");
  if (!app) return false;
  if (user.role === ROLES.OWNER) return true;
  if (app.jobId && app.jobId.createdBy?.toString() === user._id.toString()) return true;
  const companyId = app.companyId?.toString() || app.jobId?.companyId?.toString();
  if (companyId) {
    const { hasCompanyAccess } = require("./companyAccessService");
    const { allowed } = await hasCompanyAccess(user._id.toString(), companyId);
    if (allowed) return true;
  }
  return false;
}

/** Get all applications for recruiter, grouped by job and status */
async function getApplicationsGrouped(user) {
  const jobIds = await getAccessibleJobIds(user);

  const applications = await Application.find({ jobId: { $in: jobIds } })
    .select("+recruiterNotes")
    .populate("jobId", "title company location jobType companyId createdBy")
    .populate("applicant", "name email")
    .populate("lastUpdatedBy", "name")
    .populate("recruiterNotes.createdBy", "name")
    .sort({ lastUpdatedAt: -1, createdAt: -1 })
    .lean();

  const byStatus = {};
  ALLOWED_STATUSES.forEach((s) => {
    byStatus[s] = [];
  });

  for (const app of applications) {
    const job = app.jobId;
    const status = toPipelineStatus(app.status);
    byStatus[status].push({
      ...app,
      jobTitle: job?.title,
      job: job ? { _id: job._id, title: job.title, company: job.company, location: job.location, jobType: job.jobType } : null,
    });
  }

  return {
    applications,
    byStatus,
  };
}

/** Get applicants for a specific job */
async function getApplicantsForJob(user, jobId) {
  const job = await Job.findById(jobId);
  if (!job) return null;

  const isOwner = user.role === ROLES.OWNER;
  const ownsJob = job.createdBy?.toString() === user._id.toString();
  if (!isOwner && !ownsJob) return null;

  const applications = await Application.find({ jobId })
    .select("+recruiterNotes")
    .populate("applicant", "name email")
    .populate("lastUpdatedBy", "name")
    .sort({ lastUpdatedAt: -1, createdAt: -1 })
    .lean();

  return applications.map((a) => ({
    ...a,
    jobTitle: job.title,
  }));
}

/** Update application status with validation */
async function updateStatus(user, applicationId, newStatus, note) {
  if (!isValidPipelineStatus(newStatus)) {
    throw new Error("Invalid status");
  }

  const app = await Application.findById(applicationId).select("+recruiterNotes +statusHistory");
  if (!app) throw new Error("Application not found");

  const accessible = await canAccessApplication(user, applicationId);
  if (!accessible) throw new Error("Not authorized");

  const fromStatus = app.status;
  app.status = newStatus;
  app.lastUpdatedBy = user._id;
  app.lastUpdatedAt = new Date();
  app.statusHistory = app.statusHistory || [];
  app.statusHistory.push({
    from: fromStatus,
    to: newStatus,
    changedBy: user._id,
    changedAt: new Date(),
    note: note && String(note).trim() ? String(note).trim() : undefined,
  });
  await app.save();

  return app;
}

/** Add recruiter note */
async function addNote(user, applicationId, text) {
  if (!STAFF_ROLES.includes(user.role)) {
    throw new Error("Not authorized");
  }

  const accessible = await canAccessApplication(user, applicationId);
  if (!accessible) throw new Error("Not authorized");

  const app = await Application.findById(applicationId).select("+recruiterNotes");
  if (!app) throw new Error("Application not found");

  app.recruiterNotes.push({
    text: String(text || "").trim(),
    createdBy: user._id,
  });
  await app.save();

  return app;
}

module.exports = {
  getAccessibleJobIds,
  canAccessApplication,
  getApplicationsGrouped,
  getApplicantsForJob,
  updateStatus,
  addNote,
  toApplicantStatus,
  toPipelineStatus,
};
