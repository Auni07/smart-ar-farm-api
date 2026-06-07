const express = require("express");
const router = express.Router();
const userActivityController = require("../controllers/userActivityController");

router.get("/", userActivityController.getAllActivities);
router.post("/", userActivityController.createActivity);

module.exports = router;