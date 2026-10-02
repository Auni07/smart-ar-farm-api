const express = require("express");
const router = express.Router();
const userActivityController = require("../controllers/userActivityController");

router.get("/", userActivityController.getAllActivities);
router.post("/", userActivityController.createActivity);
router.post("/login", userActivityController.createLoginActivity);
router.post("/register", userActivityController.createRegisterActivity);
router.post("/view", userActivityController.createViewActivity);
router.post("/scan", userActivityController.createScanActivity);
router.post("/interact", userActivityController.createInteractActivity);
router.post("/water", userActivityController.createWaterActivity);
router.post("/collect", userActivityController.createCollectActivity);
router.post("/unique-view", userActivityController.createUniqueView);
router.post("/unique-scan", userActivityController.createUniqueScan);

module.exports = router;