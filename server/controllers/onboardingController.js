/**
 * Onboarding checklist - employer (owner) and candidate flows.
 */
const Company = require("../models/Company");
const Facility = require("../models/Facility");
const Invite = require("../models/Invite");
const Job = require("../models/Job");
const Application = require("../models/Application");
const CandidateProfile = require("../models/CandidateProfile");
const CandidateDocument = require("../models/CandidateDocument");
const OnboardingChecklist = require("../models/OnboardingChecklist");
const { ROLES } = require("../constants/roles");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

function toId(v) {
  if (!v) return null;
  return (v._id || v).toString();
}

/**
 * GET /api/onboarding - Get checklist for current user.
 */
exports.getChecklist = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const role = req.user.role;

    if (role === ROLES.OWNER) {
      const companies = await Company.find({ ownerId: req.user._id }).select("_id").lean();
      const companyIds = companies.map((c) => c._id);
      const firstCompanyId = companyIds[0];

      const [hasFacility, hasInvite, hasJob, checklist] = await Promise.all([
        firstCompanyId ? Facility.exists({ companyId: firstCompanyId }) : false,
        companyIds.length ? Invite.exists({ companyId: { $in: companyIds } }) : false,
        companyIds.length ? Job.exists({ companyId: { $in: companyIds } }) : false,
        OnboardingChecklist.findOne({ userId: req.user._id, companyId: firstCompanyId || null }).lean(),
      ]);

      const steps = [
        {
          key: "createCompany",
          label: "Create Company",
          done: companies.length > 0,
          link: "/dashboard/companies/manage",
        },
        {
          key: "createFacility",
          label: "Create Facility",
          done: !!hasFacility,
          link: "/dashboard/facilities",
        },
        {
          key: "inviteRecruiter",
          label: "Invite Recruiter",
          done: !!hasInvite,
          link: "/invite-recruiter",
        },
        {
          key: "postJob",
          label: "Post First Job",
          done: !!hasJob,
          link: "/post-job",
        },
        {
          key: "reviewPipeline",
          label: "Review Pipeline",
          done: !!(checklist?.markedComplete?.reviewPipeline),
          link: "/applicant-pipeline",
        },
      ];

      return res.status(200).json({
        success: true,
        data: { type: "employer", steps, allDone: steps.every((s) => s.done) },
      });
    }

    if (role === ROLES.APPLICANT) {
      const [profile, docCount, appCount, checklist] = await Promise.all([
        CandidateProfile.findOne({ userId: req.user._id }).lean(),
        CandidateDocument.countDocuments({ userId: req.user._id }),
        Application.countDocuments({ applicant: req.user._id }),
        OnboardingChecklist.findOne({ userId: req.user._id, companyId: null }).lean(),
      ]);

      const profileComplete =
        !!profile && (!!(profile.phone?.trim()) || !!(profile.address?.line1 || profile.address?.city));

      const steps = [
        {
          key: "completeProfile",
          label: "Complete Profile",
          done: profileComplete,
          link: "/my-profile",
        },
        {
          key: "uploadDocs",
          label: "Upload Required Docs",
          done: docCount > 0,
          link: "/my-profile",
        },
        {
          key: "applyToJob",
          label: "Apply to a Job",
          done: appCount > 0,
          link: "/jobs",
        },
        {
          key: "checkInbox",
          label: "Check Inbox",
          done: !!(checklist?.markedComplete?.checkInbox),
          link: "/inbox",
        },
      ];

      return res.status(200).json({
        success: true,
        data: { type: "candidate", steps, allDone: steps.every((s) => s.done) },
      });
    }

    return res.status(200).json({
      success: true,
      data: { type: "none", steps: [], allDone: true },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch onboarding"),
    });
  }
};

/**
 * PATCH /api/onboarding/step - Mark step complete (reviewPipeline, checkInbox).
 */
exports.markStepComplete = async (req, res) => {
  try {
    const { step } = req.body;
    const validSteps = ["reviewPipeline", "checkInbox"];
    if (!step || !validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        message: `step must be one of: ${validSteps.join(", ")}`,
      });
    }

    const userId = req.user._id;
    let companyId = null;

    if (step === "reviewPipeline" && req.user.role === ROLES.OWNER) {
      const company = await Company.findOne({ ownerId: userId }).select("_id").lean();
      companyId = company?._id;
    }

    await OnboardingChecklist.findOneAndUpdate(
      { userId, companyId: companyId || null },
      { $set: { [`markedComplete.${step}`]: new Date() } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to mark step"),
    });
  }
};
