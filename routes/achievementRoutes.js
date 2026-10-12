const express = require("express");
const router = express.Router();
const achievementController = require("../controllers/achievementController");

router.get("/achievement", achievementController.getAchievements);
router.get("/quiz-achievements", achievementController.getQuizAchievements);
router.get("/achievement/:achievement_id", achievementController.getAchievementById);
router.get("/complete-badge", achievementController.getCompleteBadge);

module.exports = router;