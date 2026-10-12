
const express = require("express");
const router = express.Router();

const quizController = require("../controllers/quizController");

router.get("/sets", quizController.getQuizSets);
router.get("/sets/all", quizController.getAllQuizSets);
router.get("/sets/:quiz_set_id/questions",quizController.getQuizQuestions);
router.get("/ar-sessions/:ar_quiz_session_id/questions",quizController.getARQuizQuestions);
router.post("/ar-sessions",quizController.createARQuizSession);
router.post("/attempt",quizController.submitQuizAttempt);
router.post("/ar-attempt",quizController.submitARQuizAttempt);

module.exports = router;
