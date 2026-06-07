const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");

router.get("/", contentController.getContent);
router.post("/add", contentController.addContent);
router.put("/update/:id", contentController.updateContent);
router.delete("/delete/:id", contentController.deleteContent);

module.exports = router;