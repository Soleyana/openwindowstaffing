const { DEFAULT_COMPANY } = require("../config/env");

const emailService = require("../services/emailService");

function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, 2000).replace(/[<>]/g, "");
}

/**
 * Contact form submission. Accepts name, email, subject, message.
 * Sends to CONTACT_EMAIL via emailService.
 */
exports.submit = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const n = sanitize(name);
    const e = sanitize(email);
    const s = sanitize(subject);
    const m = sanitize(message);

    if (!n || !e || !m) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    emailService.sendContactNotification(n, e, s, m).catch((err) =>
      console.error("[Email] Contact notification failed:", err?.message)
    );

    return res.status(200).json({
      success: true,
      message: "Thank you. We'll be in touch soon.",
    });
  } catch (err) {
    console.error("Contact submit error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to send message",
    });
  }
};
