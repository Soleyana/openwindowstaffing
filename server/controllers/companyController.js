const Company = require("../models/Company");
const { getAccessibleCompanyIds, isCompanyOwner } = require("../services/companyAccessService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const activityLogService = require("../services/activityLogService");

/**
 * GET /api/companies/public - List active companies for public use (e.g. review form).
 * Returns minimal: { _id, name }
 */
exports.getPublicCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ status: "active" })
      .select("_id name")
      .sort({ name: 1 })
      .lean();
    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to load companies"),
    });
  }
};

/**
 * POST /api/companies - Create company (owner only).
 * First owner may not have a company yet; this creates their initial one.
 */
exports.createCompany = async (req, res) => {
  try {
    const { name, legalName, billingEmail, phone, address, website } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    const company = await Company.create({
      name: name.trim(),
      legalName: legalName?.trim(),
      billingEmail: billingEmail?.trim(),
      phone: phone?.trim(),
      address: address || {},
      website: website?.trim(),
      ownerId: req.user._id,
      status: "active",
    });

    await activityLogService.logFromReq(req, {
      companyId: company._id,
      targetType: "Company",
      targetId: company._id.toString(),
      actionType: "company_created",
      message: `Company ${company.name} created`,
    });

    res.status(201).json({
      success: true,
      data: company.toObject(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to create company"),
    });
  }
};

/**
 * GET /api/companies - List companies the user can access (recruiter/owner scoped).
 */
exports.getCompanies = async (req, res) => {
  try {
    const companyIds = await getAccessibleCompanyIds(req.user._id.toString());
    if (companyIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const companies = await Company.find({ _id: { $in: companyIds } })
      .select("-__v")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch companies"),
    });
  }
};

/** @deprecated Use getCompanies. Kept for backwards compatibility. */
exports.getMyCompanies = exports.getCompanies;

/**
 * GET /api/companies/:companyId - Get single company (requireCompanyAccess).
 */
exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId)
      .select("-__v")
      .lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch company"),
    });
  }
};

/**
 * PATCH /api/companies/:companyId - Update company (owner/admin only).
 */
exports.updateCompany = async (req, res) => {
  try {
    const { name, legalName, billingEmail, phone, address, website, status } = req.body;
    const updates = {};
    if (name !== undefined) {
      const trimmed = name?.trim();
      if (!trimmed) return res.status(400).json({ success: false, message: "Company name cannot be empty" });
      updates.name = trimmed;
    }
    if (legalName !== undefined) updates.legalName = legalName?.trim();
    if (billingEmail !== undefined) updates.billingEmail = billingEmail?.trim();
    if (phone !== undefined) updates.phone = phone?.trim();
    if (address !== undefined) updates.address = address || {};
    if (website !== undefined) updates.website = website?.trim();
    if (status !== undefined) {
      if (!["active", "inactive", "suspended"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      const company = await Company.findById(req.params.companyId).select("-__v").lean();
      return res.status(200).json({ success: true, data: company });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.companyId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .lean();

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await activityLogService.logFromReq(req, {
      companyId: company._id,
      targetType: "Company",
      targetId: company._id.toString(),
      actionType: "company_updated",
      message: `Company ${company.name} updated`,
    });

    res.status(200).json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update company"),
    });
  }
};
