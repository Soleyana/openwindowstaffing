const Facility = require("../models/Facility");
const { hasCompanyAccess } = require("../services/companyAccessService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const activityLogService = require("../services/activityLogService");

/**
 * POST /api/facilities - Create facility (owner/recruiter with company access).
 */
exports.createFacility = async (req, res) => {
  try {
    const { companyId, name, address, departments } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Facility name is required" });
    }

    const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const facility = await Facility.create({
      companyId,
      name: name.trim(),
      address: address || {},
      departments: Array.isArray(departments) ? departments : [],
    });

    await activityLogService.logFromReq(req, {
      companyId,
      targetType: "Facility",
      targetId: facility._id.toString(),
      actionType: "facility_created",
      message: `Facility ${facility.name} created`,
    });

    res.status(201).json({
      success: true,
      data: facility.toObject(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create facility"),
    });
  }
};

/**
 * GET /api/facilities?companyId=... - List facilities.
 * When companyId not provided, returns facilities for all companies the user can access.
 */
exports.getFacilities = async (req, res) => {
  try {
    const { companyId } = req.query;
    const { getAccessibleCompanyIds } = require("../services/companyAccessService");

    let companyIds;
    if (companyId) {
      const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      companyIds = [companyId];
    } else {
      companyIds = await getAccessibleCompanyIds(req.user._id.toString());
      if (companyIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
    }

    const facilities = await Facility.find({ companyId: { $in: companyIds } }).lean();
    res.status(200).json({ success: true, data: facilities });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch facilities"),
    });
  }
};

/**
 * PATCH /api/facilities/:facilityId - Update facility (owner/admin only).
 * Company resolved from facility.companyId; requireCompanyAccess + requireCompanyOwnerOrAdmin.
 */
exports.updateFacility = async (req, res) => {
  try {
    const { name, address, departments, status } = req.body;
    const updates = {};
    if (name !== undefined) {
      const trimmed = name?.trim();
      if (!trimmed) return res.status(400).json({ success: false, message: "Facility name cannot be empty" });
      updates.name = trimmed;
    }
    if (address !== undefined) updates.address = address || {};
    if (departments !== undefined) updates.departments = Array.isArray(departments) ? departments : [];
    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      const facility = await Facility.findById(req.params.facilityId).lean();
      return res.status(200).json({ success: true, data: facility });
    }

    const facility = await Facility.findByIdAndUpdate(
      req.params.facilityId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!facility) {
      return res.status(404).json({ success: false, message: "Facility not found" });
    }

    await activityLogService.logFromReq(req, {
      companyId: facility.companyId,
      targetType: "Facility",
      targetId: facility._id.toString(),
      actionType: "facility_updated",
      message: `Facility ${facility.name} updated`,
    });

    res.status(200).json({ success: true, data: facility });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update facility"),
    });
  }
};
