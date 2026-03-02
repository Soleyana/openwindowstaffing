const ActivityLog = require("../models/ActivityLog");
const { getAccessibleCompanyIds } = require("../services/companyAccessService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/activity?companyId=...&targetType=...&targetId=...
 */
exports.getActivity = async (req, res) => {
  try {
    const { companyId, targetType, targetId } = req.query;

    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());

    const query = {};
    if (companyId) {
      if (!companyIds.includes(companyId)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      query.companyId = companyId;
    } else if (companyIds.length > 0) {
      query.companyId = { $in: companyIds };
    } else {
      query.actorUserId = req.user._id;
    }

    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actorUserId", "name email")
      .lean();

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch activity"),
    });
  }
};
