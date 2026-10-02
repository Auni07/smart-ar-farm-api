const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminAuthController");
const authenticateAdmin = require("../middleware/authenticateAdmin");

router.post("/login", adminController.login);
router.post("/addnew", adminController.addNewAdmin);
router.post("/logout", adminController.logout);
router.get("/me", authenticateAdmin, adminController.me);

module.exports = router;