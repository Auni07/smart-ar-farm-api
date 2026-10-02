const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

router.get("/profile", profileController.getProfile);
router.put("/edit", profileController.editProfile);
router.get("/achievement", profileController.getAchievements);
router.get("/complete-badge", profileController.getCompleteBadge);

module.exports = router;