/**
 * Newsletter subscribe / unsubscribe
 */
const crypto = require("crypto");
const NewsletterSubscription = require("../models/NewsletterSubscription");
const emailService = require("../services/emailService");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const logger = require("../utils/logger");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s) {
  return typeof s === "string" && s.trim().length > 0 && EMAIL_REGEX.test(s.trim());
}

/**
 * POST /api/newsletter/subscribe
 * Body: { email }
 */
exports.subscribe = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }

    let sub = await NewsletterSubscription.findOne({ email });
    if (sub) {
      if (sub.status === "unsubscribed") {
        sub.status = "active";
        sub.unsubscribedAt = null;
        sub.unsubscribeToken = crypto.randomBytes(32).toString("hex");
        await sub.save();
      }
      return res.status(200).json({
        success: true,
        message: "You're subscribed. Check your inbox for updates.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await NewsletterSubscription.create({
      email,
      unsubscribeToken: token,
      status: "active",
    });

    const { CLIENT_URL } = require("../config/env");
    const unsubscribeUrl = `${CLIENT_URL || "https://example.com"}/unsubscribe?token=${token}`;
    const html = `
      <p>You've subscribed to our newsletter.</p>
      <p>To unsubscribe: <a href="${unsubscribeUrl}">Click here</a></p>
      <p>— ${process.env.DEFAULT_COMPANY || "Staffing Platform"}</p>
    `;
    emailService.sendEmail(email, "Newsletter subscription confirmed", html).catch(() => {});

    res.status(201).json({
      success: true,
      message: "You're subscribed. Check your inbox for confirmation.",
    });
  } catch (error) {
    logger.error({ err: error.message }, "Newsletter subscribe error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to subscribe"),
    });
  }
};

/**
 * POST /api/newsletter/unsubscribe
 * Body: { token } or query: ?token=
 */
exports.unsubscribe = async (req, res) => {
  try {
    const token = (req.body?.token || req.query?.token || "").trim();
    if (!token) {
      return res.status(400).json({ success: false, message: "Unsubscribe token is required" });
    }

    const sub = await NewsletterSubscription.findOne({ unsubscribeToken: token });
    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscription not found or already unsubscribed" });
    }

    sub.status = "unsubscribed";
    sub.unsubscribedAt = new Date();
    await sub.save();

    res.status(200).json({
      success: true,
      message: "You've been unsubscribed successfully.",
    });
  } catch (error) {
    logger.error({ err: error.message }, "Newsletter unsubscribe error");
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to unsubscribe"),
    });
  }
};
