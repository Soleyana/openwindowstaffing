const CandidateProfile = require("../models/CandidateProfile");
const CandidateDocument = require("../models/CandidateDocument");
const User = require("../models/User");
const { ROLES } = require("../constants/roles");
const candidateService = require("../services/candidateService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/candidates/me - Applicant's own profile.
 */
exports.getMyProfile = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const profile = await candidateService.getOrCreateProfile(req.user._id);
    const populated = await CandidateProfile.findById(profile._id)
      .populate("userId", "name email")
      .lean();

    const documents = await CandidateDocument.find({ userId: req.user._id }).sort({ uploadedAt: -1 }).lean();
    const data = { ...populated, documents };

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch profile"),
    });
  }
};

/**
 * PUT /api/candidates/me - Update applicant's own profile.
 */
exports.updateMyProfile = async (req, res) => {
  try {
    if (req.user.role !== ROLES.APPLICANT) {
      return res.status(403).json({ success: false, message: "Applicants only" });
    }

    const profile = await candidateService.getOrCreateProfile(req.user._id);

    const allowed = [
      "phone", "address", "yearsExperience", "specialties", "shiftPreference",
      "travelWillingness", "earliestStartDate", "license", "certifications",
      "workHistory", "skills", "summary",
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) profile[key] = req.body[key];
    });

    await profile.save();
    const populated = await CandidateProfile.findById(profile._id)
      .populate("userId", "name email")
      .lean();

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update profile"),
    });
  }
};
