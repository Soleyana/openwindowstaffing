/**
 * Helper to create in-app notifications from events.
 */
const Notification = require("../models/Notification");

async function create({ userId, companyId, type, title, body, url }) {
  if (!userId) return;
  try {
    await Notification.create({ userId, companyId, type, title, body, url });
  } catch (err) {
    console.error("[notificationService] Failed to create:", err?.message);
  }
}

module.exports = {
  create,
};
