const Notification = require("../models/notifications");
const ProfessorAccount = require('../models/professorAccount');
const Report = require('../models/report')

const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.type.Id;

    const notifications = await Notification.find({ userId: userId })
      .sort({ createdAt: -1 });

    const updatedNotifications = await Promise.all(notifications.map(async (notification) => {
      if (notification.referenceModel === "Review") {
        const professorAccount = await ProfessorAccount.findOne({ 'reviews._id': notification.reference });

        if (professorAccount) {
          const review = professorAccount.reviews.find(review => review._id.toString() === notification.reference.toString());
          notification.reference = review;
        }
      }

      if (notification.referenceModel === "Comment") {
        const professorAccount = await ProfessorAccount.findOne({ 'reviews.comments._id': notification.reference });

        if (professorAccount) {
          const comment = professorAccount.reviews
            .flatMap(review => review.comments)
            .find(comment => comment._id.toString() === notification.reference.toString());
          notification.reference = comment;
        }
      }
      if (notification.referenceModel === "Report") {
        const report = await Report.findOne({ reporterId: notification.reference }).populate('professorId');
        if (report) {
          notification.reference = report;
        }
      }

      return notification;

    }));

    res.status(200).json({ notifications: updatedNotifications });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications', error: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const deletedNotification = await Notification.findByIdAndDelete(notificationId);

    if (!deletedNotification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};


module.exports = { getUserNotifications, markNotificationAsRead, deleteNotification };
