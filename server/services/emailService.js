/**
 * Email service. Uses Resend when RESEND_API_KEY is set.
 * Logs via logger when no key (dev). Never crashes on send failure.
 */
const { RESEND_API_KEY, FROM_EMAIL, COMPANY_NAME, CLIENT_URL } = require("../config/env");
const logger = require("../utils/logger");

let resendClient = null;
if (RESEND_API_KEY) {
  try {
    const { Resend } = require("resend");
    resendClient = new Resend(RESEND_API_KEY);
  } catch (err) {
    logger.warn({ err: err.message }, "[Email] Resend not available");
  }
}

/**
 * Send an email. Fails silently - log errors, don't throw.
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} html - HTML body
 * @returns {Promise<boolean>} - true if sent (or no provider), false on error
 */
async function sendEmail(to, subject, html) {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    logger.warn({ to }, "[Email] Invalid recipient");
    return false;
  }

  if (!resendClient) {
    logger.info({ to, subject }, "[Email] No RESEND_API_KEY – would send");
    return true;
  }

  try {
    const from = `${COMPANY_NAME} <${FROM_EMAIL}>`;
    const { data, error } = await resendClient.emails.send({
      from,
      to: [to.trim()],
      subject: String(subject || "Message").slice(0, 200),
      html: String(html || "").slice(0, 50000),
    });
    if (error) {
      logger.error({ err: error.message }, "[Email] Send failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err: err.message }, "[Email] Send error");
    return false;
  }
}

/** Application confirmation to applicant */
async function sendApplicationConfirmation(applicantEmail, applicantName, jobTitle) {
  const subject = `Application received – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(applicantName || "there")},</p>
    <p>We've received your application for <strong>${escapeHtml(jobTitle || "the position")}</strong>.</p>
    <p>Our team will review it and get back to you soon.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(applicantEmail, subject, html);
}

/** Password reset link */
async function sendPasswordResetLink(email, resetUrl) {
  const subject = "Reset your password";
  const html = `
    <p>You requested a password reset for your ${escapeHtml(COMPANY_NAME)} account.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(email, subject, html);
}

/** Contact form – notify internal team */
async function sendContactNotification(fromName, fromEmail, subject, message) {
  const { CONTACT_EMAIL } = require("../config/env");
  const to = CONTACT_EMAIL || FROM_EMAIL;
  const subj = subject ? `Contact: ${subject}` : "Contact form submission";
  const html = `
    <p><strong>From:</strong> ${escapeHtml(fromName)} &lt;${escapeHtml(fromEmail)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject || "(none)")}</p>
    <hr/>
    <pre>${escapeHtml(message)}</pre>
  `;
  return sendEmail(to, subj, html);
}

/** Status change notification to applicant */
async function sendStatusChangeNotification(applicantEmail, applicantName, jobTitle, newStatus) {
  const statusLabels = {
    applied: "Applied",
    reviewing: "Under Review",
    contacted: "Contacted",
    submitted_to_facility: "Submitted to Facility",
    interview_scheduled: "Interview Scheduled",
    offer_received: "Offer Received",
    placed: "Placed",
    assignment_completed: "Assignment Completed",
    rejected: "Not Selected",
  };
  const label = statusLabels[newStatus] || newStatus;
  const subject = `Application update – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(applicantName || "there")},</p>
    <p>Your application for <strong>${escapeHtml(jobTitle || "the position")}</strong> has been updated.</p>
    <p><strong>New status:</strong> ${escapeHtml(label)}</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(applicantEmail, subject, html);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  sendEmail,
  sendApplicationConfirmation,
  sendPasswordResetLink,
  sendContactNotification,
  sendStatusChangeNotification,
};
