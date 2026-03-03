/**
 * Background job definitions and scheduling.
 * Uses Agenda (MongoDB-based). Optional - runs if MONGODB_URI and ENABLE_BACKGROUND_JOBS are set.
 * Safe mode: job failures are logged with jobRunId and do not crash the server.
 */
const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

let agenda = null;

function shouldStartJobs() {
  return (
    process.env.ENABLE_BACKGROUND_JOBS === "true" ||
    process.env.ENABLE_BACKGROUND_JOBS === "1"
  );
}

function wrapJob(name, fn) {
  return async (job) => {
    const jobRunId = job.attrs?._id?.toString() || `${name}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      await fn(job);
    } catch (err) {
      logger.error({ jobRunId, jobName: name, err: err.message, stack: err.stack }, "Background job failed");
      throw err;
    }
  };
}

async function startJobs() {
  if (!shouldStartJobs()) {
    logger.info("Background jobs skipped (ENABLE_BACKGROUND_JOBS not set)");
    return null;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    logger.info("Background jobs skipped (no MONGODB_URI)");
    return null;
  }

  try {
    const Agenda = require("agenda");
    agenda = new Agenda({
      db: { address: MONGODB_URI, collection: "agendaJobs" },
      processEvery: "1 minute",
    });

    agenda.on("error", (err) => logger.error({ err }, "Agenda error"));
    agenda.on("fail", (err, job) => {
      const jobRunId = job?.attrs?._id?.toString() || "unknown";
      logger.error({ jobRunId, jobName: job?.attrs?.name, err: err?.message }, "Job run failed");
    });

    // Job expiry check - hourly
    agenda.define("check job expiry", wrapJob("check job expiry", async () => {
      try {
        const Job = require("../models/Job");
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const expired = await Job.find({
          expiresAt: { $lte: now, $gte: oneHourAgo },
        }).populate("createdBy", "email name");

        const emailService = require("../services/emailService");
        for (const job of expired) {
          if (job.createdBy?.email) {
            await emailService.sendJobExpiredNotification(
              job.createdBy.email,
              job.createdBy.name,
              job.title
            );
          }
        }
        if (expired.length > 0) {
          logger.info({ count: expired.length }, "Processed expired jobs");
        }
      } catch (err) {
        logger.error({ err }, "Job expiry check failed");
      }
    }));

    // Job alerts digest - weekly ( Mondays 9am )
    agenda.define("job alerts digest", wrapJob("job alerts digest", async () => {
      try {
        const JobAlertSubscription = require("../models/JobAlertSubscription");
        const Job = require("../models/Job");
        const emailService = require("../services/emailService");

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const newJobs = await Job.find({
          createdAt: { $gte: oneWeekAgo },
          $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        })
          .select("title description company location category _id")
          .lean();

        const subscriptions = await JobAlertSubscription.find({}).lean();
        for (const sub of subscriptions) {
          let jobs = newJobs;
          if (sub.keywords?.trim()) {
            const kw = new RegExp(sub.keywords.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            jobs = newJobs.filter(
              (j) => kw.test(j.title || "") || kw.test(j.description || "") || kw.test(j.company || "")
            );
          }
          if (sub.category?.trim()) {
            jobs = jobs.filter((j) => (j.category || "").toLowerCase() === sub.category.trim().toLowerCase());
          }
          if (sub.location?.trim()) {
            const loc = new RegExp(sub.location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            jobs = jobs.filter((j) => loc.test(j.location || ""));
          }
          if (jobs.length > 0 && sub.email) {
            await emailService.sendJobAlertsDigest(sub.email, jobs, sub.keywords);
            await JobAlertSubscription.findByIdAndUpdate(sub._id, { lastDigestSentAt: new Date() });
          }
        }
      } catch (err) {
        logger.error({ err }, "Job alerts digest failed");
      }
    }));

    // Compliance expiry (company-config aware) - daily
    agenda.define("compliance expiry reminders", wrapJob("compliance expiry reminders", async () => {
      try {
        const Company = require("../models/Company");
        const Application = require("../models/Application");
        const Assignment = require("../models/Assignment");
        const User = require("../models/User");
        const ActivityLog = require("../models/ActivityLog");
        const Notification = require("../models/Notification");
        const complianceService = require("../services/complianceService");
        const emailService = require("../services/emailService");
        const CLIENT_URL = process.env.CLIENT_URL;

        const companies = await Company.find({}).select("_id complianceConfig").lean();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let sentCount = 0;

        for (const company of companies) {
          const companyId = company._id.toString();
          const candidateIds = new Set();
          const applications = await Application.find({ companyId: company._id }).select("applicant").lean();
          applications.forEach((a) => a.applicant && candidateIds.add(a.applicant.toString()));
          const assignments = await Assignment.find({ companyId: company._id }).select("candidateId").lean();
          assignments.forEach((a) => a.candidateId && candidateIds.add(a.candidateId.toString()));

          for (const cid of candidateIds) {
            const result = await complianceService.computeCompliance(cid, companyId, null);
            if (!result.expiringSoon?.length) continue;

            const existing = await ActivityLog.findOne({
              targetType: "Candidate",
              targetId: cid,
              companyId: company._id,
              actionType: "compliance_expiring_notice_sent",
              createdAt: { $gte: sevenDaysAgo },
            }).lean();
            if (existing) continue;

            const user = await User.findById(cid).select("email name").lean();
            if (!user?.email) continue;

            await emailService.sendComplianceExpiringNotice(
              user.email,
              user.name,
              result.expiringSoon,
              CLIENT_URL ? `${CLIENT_URL}/my-profile` : null
            );

            await ActivityLog.create({
              companyId: company._id,
              targetType: "Candidate",
              targetId: cid,
              actionType: "compliance_expiring_notice_sent",
              message: "Compliance expiring notice sent",
              metadata: { docTypes: result.expiringSoon.map((e) => e.type) },
            });

            await Notification.create({
              userId: cid,
              companyId: company._id,
              type: "compliance_expiring",
              title: "Compliance documents expiring soon",
              body: result.expiringSoon.map((e) => e.type).join(", "),
              url: "/my-profile",
            });
            sentCount++;
          }
        }
        if (sentCount > 0) logger.info({ count: sentCount }, "Compliance expiry notices sent");
      } catch (err) {
        logger.error({ err }, "Compliance expiry reminders failed");
      }
    }));

    // Credential expiry - daily
    agenda.define("credential expiry reminders", wrapJob("credential expiry reminders", async () => {
      try {
        const CandidateDocument = require("../models/CandidateDocument");
        const User = require("../models/User");
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const soon = await CandidateDocument.find({
          expiresAt: { $gte: new Date(), $lte: in30 },
        }).lean();

        const emailService = require("../services/emailService");
        for (const doc of soon) {
          const days = Math.ceil((doc.expiresAt - new Date()) / (24 * 60 * 60 * 1000));
          if (days <= 1 || days === 7 || days === 30) {
            const user = await User.findById(doc.userId).select("email").lean();
            if (user?.email) {
              await emailService.sendCredentialExpiryReminder(
                user.email,
                doc.type,
                doc.expiresAt,
                days
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "Credential reminder failed");
      }
    }));

    await agenda.start();

    await agenda.every("0 * * * *", "check job expiry"); // every hour
    await agenda.every("0 9 * * *", "compliance expiry reminders"); // daily 9am
    await agenda.every("0 9 * * *", "credential expiry reminders"); // daily 9am

    logger.info("Background jobs started");
    return agenda;
  } catch (err) {
    logger.warn({ err: err.message }, "Background jobs failed to start");
    return null;
  }
}

function getAgenda() {
  return agenda;
}

module.exports = { startJobs, getAgenda };
