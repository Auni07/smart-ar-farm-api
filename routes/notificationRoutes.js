const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/user/:userId", notificationController.getUserNotifications);
router.post("/", notificationController.createNotification);
router.post("/all",notificationController.createNotificationForAllUsers);
router.put("/:notificationId/read", notificationController.markAsRead);
router.delete("/:notificationId", notificationController.deleteNotification);

module.exports = router;