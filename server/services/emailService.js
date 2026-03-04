/**
 * Email service. Uses Resend when RESEND_API_KEY is set.
 * Logs via logger when no key (dev). Never crashes on send failure.
 * Uses EMAIL_FROM and optionally EMAIL_REPLY_TO from env.
 * TEST_EMAIL_OVERRIDE: when set, all emails go to that address (testing only).
 */
const { RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, COMPANY_NAME, getClientUrl, EMAIL_DISABLED, TEST_EMAIL_OVERRIDE } = require("../config/env");
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

if (TEST_EMAIL_OVERRIDE) {
  logger.warn({ to: TEST_EMAIL_OVERRIDE.replace(/(.{2}).*(@.*)/, "$1***$2") }, "[Email] TEST_EMAIL_OVERRIDE active – all emails redirected");
}

/**
 * Send an email. Fails silently - log errors, don't throw.
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} html - HTML body
 * @param {{ replyTo?: string, caller?: string, requestId?: string }} [opts] - Optional opts
 * @returns {Promise<boolean>} - true if sent (or no provider), false on error
 */
async function sendEmail(to, subject, html, opts = {}) {
  const originalTo = to;
  const effectiveTo = TEST_EMAIL_OVERRIDE ? TEST_EMAIL_OVERRIDE.trim() : to;

  if (!to || typeof to !== "string" || !to.includes("@")) {
    logger.warn({ to }, "[Email] Invalid recipient");
    return false;
  }

  const logMeta = { to: effectiveTo.replace(/(.{2}).*(@.*)/, "$1***$2"), caller: opts.caller || "unknown", requestId: opts.requestId };

  if (EMAIL_DISABLED) {
    logger.info({ ...logMeta, subject }, "[Email] Disabled (EMAIL_DISABLED=true) – would send");
    return true;
  }

  if (!resendClient) {
    logger.info({ ...logMeta, subject }, "[Email] No RESEND_API_KEY – would send");
    return true;
  }

  if (TEST_EMAIL_OVERRIDE) {
    logger.info({ ...logMeta, intendedRecipient: originalTo.replace(/(.{2}).*(@.*)/, "$1***$2") }, "[Email] Override active – redirecting");
  }

  try {
    const from = `${COMPANY_NAME} <${EMAIL_FROM}>`;
    const payload = {
      from,
      to: [effectiveTo.trim()],
      subject: String(subject || "Message").slice(0, 200),
      html: String(html || "").slice(0, 50000),
    };
    if (opts.replyTo || EMAIL_REPLY_TO) {
      payload.reply_to = opts.replyTo || EMAIL_REPLY_TO;
    }
    const { data, error } = await resendClient.emails.send(payload);
    if (error) {
      logger.error({ ...logMeta, err: error.message, resendCode: error?.statusCode }, "[Email] Send failed");
      return false;
    }
    logger.info({ ...logMeta, resendId: data?.id }, "[Email] Sent");
    return true;
  } catch (err) {
    logger.error({ ...logMeta, err: err.message }, "[Email] Send error");
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

/** Recruiter invite – send invite link to invitee */
async function sendInviteToRecruiter(inviteeEmail, inviteUrl, companyName, opts = {}) {
  const subject = `You're invited to join ${escapeHtml(companyName || COMPANY_NAME)}`;
  const html = `
    <p>You've been invited to become a recruiter for <strong>${escapeHtml(companyName || COMPANY_NAME)}</strong>.</p>
    <p><a href="${escapeHtml(inviteUrl)}">Accept your invite</a></p>
    <p>This link expires in 48 hours. If you didn't expect this invite, you can ignore this email.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(inviteeEmail, subject, html, { ...opts, caller: opts.caller || "invite" });
}

/** Password reset link */
async function sendPasswordResetLink(email, resetUrl, opts = {}) {
  const subject = "Reset your password";
  const html = `
    <p>You requested a password reset for your ${escapeHtml(COMPANY_NAME)} account.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(email, subject, html, { ...opts, caller: opts.caller || "password_reset" });
}

/** Contact form – notify internal team. replyTo = submitter for easy reply. */
async function sendContactNotification(fromName, fromEmail, subject, message, opts = {}) {
  const { CONTACT_EMAIL } = require("../config/env");
  const to = CONTACT_EMAIL || EMAIL_FROM;
  const subj = subject ? `Contact: ${subject}` : "Contact form submission";
  const html = `
    <p><strong>From:</strong> ${escapeHtml(fromName)} &lt;${escapeHtml(fromEmail)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject || "(none)")}</p>
    <hr/>
    <pre>${escapeHtml(message)}</pre>
  `;
  return sendEmail(to, subj, html, { ...opts, replyTo: fromEmail, caller: opts.caller || "contact" });
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

/** Job expired – notify recruiter */
async function sendJobExpiredNotification(recruiterEmail, recruiterName, jobTitle) {
  const subject = `Job expired – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(recruiterName || "there")},</p>
    <p>Your job posting <strong>${escapeHtml(jobTitle || "the position")}</strong> has expired.</p>
    <p>Consider reposting or extending the listing.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(recruiterEmail, subject, html);
}

/** Job alerts digest – weekly email with matching new jobs */
async function sendJobAlertsDigest(subscriberEmail, jobs, keywords) {
  if (!jobs || jobs.length === 0) return true;
  const subject = `Your weekly job digest – ${jobs.length} new job${jobs.length === 1 ? "" : "s"}`;
  const baseUrl = getClientUrl();
  const listItems = jobs.slice(0, 20).map((j) => {
    const title = escapeHtml(j.title || "Position");
    const company = escapeHtml(j.company || "");
    const loc = escapeHtml(j.location || "");
    const url = `${baseUrl}/jobs/${j._id}`;
    return `<li><a href="${escapeHtml(url)}">${title}</a> – ${company} | ${loc}</li>`;
  }).join("");
  const html = `
    <p>Here are new jobs${keywords ? ` matching "${escapeHtml(keywords)}"` : ""} posted this week:</p>
    <ul>${listItems}</ul>
    ${jobs.length > 20 ? `<p>…and ${jobs.length - 20} more. <a href="${escapeHtml(baseUrl)}/jobs">Browse all jobs</a>.</p>` : ""}
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(subscriberEmail, subject, html);
}

/** Job offer email to candidate (Offer model - links to My Offers) */
async function sendOfferToCandidate(candidateEmail, candidateName, jobTitle, opts = {}) {
  const baseUrl = getClientUrl();
  const offersUrl = `${baseUrl}/my-offers`;
  const subject = `Job offer – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(candidateName || "there")},</p>
    <p>You have been offered a position for <strong>${escapeHtml(jobTitle || "the role")}</strong>.</p>
    <p><a href="${escapeHtml(offersUrl)}">View and respond to your offer</a></p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(candidateEmail, subject, html, { ...opts, caller: opts.caller || "offer" });
}

/** Assignment offer email to candidate */
async function sendAssignmentOffer(candidateEmail, candidateName, jobTitle, assignmentId, opts = {}) {
  const baseUrl = getClientUrl();
  const acceptUrl = `${baseUrl}/my-assignments?offer=${assignmentId}`;
  const subject = `Job offer – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(candidateName || "there")},</p>
    <p>You have been offered a position for <strong>${escapeHtml(jobTitle || "the role")}</strong>.</p>
    <p><a href="${escapeHtml(acceptUrl)}">View and accept this offer</a></p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(candidateEmail, subject, html, { ...opts, caller: opts.caller || "assignment_offer" });
}

/** Contract signing link to candidate */
async function sendContractToCandidate(candidateEmail, candidateName, jobTitle, contractSignUrl) {
  const subject = `Contract to sign – ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(candidateName || "there")},</p>
    <p>Please review and sign your placement contract for <strong>${escapeHtml(jobTitle || "the position")}</strong>.</p>
    <p><a href="${escapeHtml(contractSignUrl)}">View and sign the contract</a></p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(candidateEmail, subject, html);
}

/** Credential expiry reminder to candidate */
async function sendCredentialExpiryReminder(candidateEmail, docType, expiresAt, daysLeft) {
  const dateStr = expiresAt ? new Date(expiresAt).toLocaleDateString() : "";
  const subject = `${docType} expires soon`;
  const html = `
    <p>Your ${escapeHtml(docType || "credential")} expires in ${daysLeft} day(s)${dateStr ? ` (${dateStr})` : ""}.</p>
    <p>Please upload an updated document to keep your profile current.</p>
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(candidateEmail, subject, html);
}

/** Compliance expiring soon – multiple doc types */
async function sendComplianceExpiringNotice(candidateEmail, candidateName, expiringItems, profileUrl, opts = {}) {
  const list = expiringItems.map((e) => `${e.type}${e.expiresAt ? ` (expires ${new Date(e.expiresAt).toLocaleDateString()})` : ""}`).join(", ");
  const subject = "Compliance documents expiring soon";
  const baseUrl = getClientUrl();
  const profileLink = profileUrl || `${baseUrl}/my-profile`;
  const html = `
    <p>Hi ${escapeHtml(candidateName || "there")},</p>
    <p>The following documents need to be renewed soon: <strong>${escapeHtml(list)}</strong>.</p>
    <p>Please upload updated documents to maintain your clear-to-work status.</p>
    ${profileLink ? `<p><a href="${escapeHtml(profileLink)}">Update your profile</a></p>` : ""}
    <p>— ${escapeHtml(COMPANY_NAME)}</p>
  `;
  return sendEmail(candidateEmail, subject, html);
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
  sendInviteToRecruiter,
  sendPasswordResetLink,
  sendOfferToCandidate,
  sendContractToCandidate,
  sendContactNotification,
  sendStatusChangeNotification,
  sendJobExpiredNotification,
  sendAssignmentOffer,
  sendCredentialExpiryReminder,
  sendComplianceExpiringNotice,
  sendJobAlertsDigest,
};
