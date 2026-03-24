import Notification from "../models/notificationModel";

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { organization: req.orgId, recipient: req.user._id };
    if (unreadOnly === "true") filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.status(200).json({
      data: notifications,
      unreadCount,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.notifId, recipient: req.user._id },
      { isRead: true },
      { new: true },
    );
    if (!notif)
      return res.status(404).json({ message: "Notification not found" });
    res.status(200).json({ data: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { organization: req.orgId, recipient: req.user._id, isRead: false },
      { isRead: true },
    );
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.notifId,
      recipient: req.user._id,
    });
    res.status(204).json({ status: "success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// used internally by other controllers (Utility)
const createNotification = async ({
  organization,
  recipient,
  type,
  message,
  meta = {},
}) => {
  return Notification.create({ organization, recipient, type, message, meta });
};

export {
  getNotifications,
  createNotification,
  deleteNotification,
  markAsRead,
  markAllAsRead,
};
