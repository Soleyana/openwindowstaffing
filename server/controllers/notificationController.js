/**
 * Notification controller - user's own notifications only.
 */
const Notification = require("../models/Notification");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");

/**
 * GET /api/notifications/me - List user's notifications.
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const query = { userId: req.user._id };
    if (unreadOnly === "true" || unreadOnly === "1") {
      query.readAt = { $in: [null, undefined] };
    }
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: { $in: [null, undefined] },
    });
    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch notifications"),
    });
  }
};

/**
 * POST /api/notifications/:id/read - Mark single as read.
 */
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    if (notification.userId?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    notification.readAt = notification.readAt || new Date();
    await notification.save();
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to mark read"),
    });
  }
};

/**
 * POST /api/notifications/read-all - Mark all as read.
 */
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: { $in: [null, undefined] } },
      { $set: { readAt: new Date() } }
    );
    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to mark all read"),
    });
  }
};
