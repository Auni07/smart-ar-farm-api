const express = require("express");
const router = express.Router();
const agroGuideChatController = require("../controllers/agroGuideChatController");

router.get("/connection", agroGuideChatController.checkConnection);
router.post("/chat", agroGuideChatController.chat);

module.exports = router;