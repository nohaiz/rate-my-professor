const express = require('express');
const router = express.Router();
const { getUserNotifications, markNotificationAsRead, deleteNotification } = require('../controllers/notificationController');

router.get('/', getUserNotifications);
router.put('/:notificationId/read', markNotificationAsRead);
router.delete('/:notificationId', deleteNotification);


module.exports = router;
