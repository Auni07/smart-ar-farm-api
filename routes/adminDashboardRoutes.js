const express = require("express");
const router = express.Router();
const adminDashboardController = require("../controllers/adminDashboardController");

router.get("/",adminDashboardController.getCompleteDashboard);
router.get("/summary",adminDashboardController.getDashboardSummary);
router.get("/activity-frequency",adminDashboardController.getActivityFrequency);
router.get("/top-plants",adminDashboardController.getTopPlants);
router.get("/latest-activities",adminDashboardController.getLatestActivities);
router.get("/all-activities",adminDashboardController.getAllActivities);
router.get("/quiz",adminDashboardController.getQuizDashboard);

module.exports = router;