const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");

router.get("/faq", supportController.getAllFaqs);
router.post("/report", supportController.createReport);
router.get("/policy", supportController.getPrivacyPolicy);
router.get("/terms", supportController.getTermsOfService);

module.exports = router;