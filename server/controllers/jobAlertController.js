const JobAlertSubscription = require("../models/JobAlertSubscription");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

exports.subscribe = async (req, res) => {
  try {
    const { email, keywords, category, location } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    await JobAlertSubscription.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        keywords: keywords?.trim() || "",
        category: category?.trim() || "",
        location: location?.trim() || "",
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: "You're subscribed. We'll send you a weekly digest of matching jobs.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to subscribe"),
    });
  }
};
