const StaffingRequest = require("../models/StaffingRequest");
const { hasCompanyAccess, getAccessibleCompanyIds } = require("../services/companyAccessService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

exports.create = async (req, res) => {
  try {
    const { companyId, facilityId, title, description, category, quantity, role, shift, startDate, payRange, notes } = req.body;

    if (!companyId || !title?.trim()) {
      return res.status(400).json({ success: false, message: "companyId and title are required" });
    }

    const { allowed } = await hasCompanyAccess(req.user._id.toString(), companyId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const request = await StaffingRequest.create({
      companyId,
      facilityId: facilityId || undefined,
      requestedBy: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      category: category?.trim(),
      quantity: quantity ?? 1,
      role: role?.trim(),
      shift: shift?.trim(),
      startDate: startDate ? new Date(startDate) : undefined,
      payRange: payRange?.trim(),
      notes: notes?.trim(),
    });

    res.status(201).json({ success: true, data: request.toObject() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create staffing request"),
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, role, shift, startDate, payRange, notes } = req.body;

    const request = await StaffingRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const { allowed } = await hasCompanyAccess(req.user._id.toString(), request.companyId.toString());
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (status !== undefined) request.status = status;
    if (title !== undefined) request.title = title.trim();
    if (description !== undefined) request.description = description?.trim();
    if (role !== undefined) request.role = role?.trim();
    if (shift !== undefined) request.shift = shift?.trim();
    if (startDate !== undefined) request.startDate = startDate ? new Date(startDate) : null;
    if (payRange !== undefined) request.payRange = payRange?.trim();
    if (notes !== undefined) request.notes = notes?.trim();
    await request.save();

    res.status(200).json({ success: true, data: request.toObject() });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update staffing request"),
    });
  }
};

exports.list = async (req, res) => {
  try {
    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    if (companyIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const requests = await StaffingRequest.find({ companyId: { $in: companyIds } })
      .sort({ createdAt: -1 })
      .populate("facilityId", "name")
      .lean();

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to list staffing requests"),
    });
  }
};
