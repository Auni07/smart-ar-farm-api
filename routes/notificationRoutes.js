const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/user/:userId", notificationController.getUserNotifications);
router.put("/:notificationId/read", notificationController.markAsRead);
router.get("/unique",notificationController.getAllUniqueNotifications);
router.post("/", notificationController.createNotification);
router.post("/create/all",notificationController.createNotificationToAllUsers);
router.post("/create/new-users",notificationController.createNotificationToNewUsers);
router.delete("/:notificationId", notificationController.deleteNotification);

module.exports = router;