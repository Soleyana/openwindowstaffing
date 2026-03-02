const CandidateProfile = require("../models/CandidateProfile");
const CandidateDocument = require("../models/CandidateDocument");
const Application = require("../models/Application");
const ActivityLog = require("../models/ActivityLog");
const candidateService = require("../services/candidateService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/recruiter/candidates - Search candidates with filters.
 */
exports.searchCandidates = async (req, res) => {
  try {
    const { specialty, licenseState, expiringSoon, verifiedStatus } = req.query;
    const result = await candidateService.searchCandidates(req.user, {
      specialty,
      licenseState,
      expiringSoon,
      verifiedStatus,
    });

    res.status(200).json({
      success: true,
      data: result.candidates,
      total: result.total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to search candidates"),
    });
  }
};

/**
 * GET /api/recruiter/candidates/:candidateId - Candidate detail (profile + docs + activity).
 */
exports.getCandidateDetail = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidateIds = await candidateService.getAccessibleCandidateIds(req.user);
    if (!candidateIds.includes(candidateId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const profile = await CandidateProfile.findOne({ userId: candidateId })
      .populate("userId", "name email")
      .lean();

    const docs = await CandidateDocument.find({ userId: candidateId }).sort({ uploadedAt: -1 }).lean();

    const applications = await Application.find({ applicant: candidateId })
      .populate("jobId", "title company location status companyId")
      .select("status jobId companyId createdAt")
      .lean();

    const suggestedCompanyId =
      applications?.[0]?.companyId?.toString() ||
      applications?.[0]?.jobId?.companyId?.toString() ||
      null;

    const appIds = (applications || []).map((a) => a._id.toString());
    const docIds = (docs || []).map((d) => d._id.toString());
    const activity = await ActivityLog.find({
      $or: [
        { targetType: "Application", targetId: { $in: appIds } },
        { targetType: "Candidate", targetId: candidateId },
        { targetType: "Document", targetId: { $in: docIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actorUserId", "name")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        profile: profile || { userId: { _id: candidateId } },
        documents: docs,
        applications,
        activity,
        suggestedCompanyId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch candidate"),
    });
  }
};
