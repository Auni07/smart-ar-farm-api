const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminAuthController");
const authenticateAdmin = require("../middleware/authenticateAdmin");

router.post("/login", adminController.login);
router.get("/profile", authenticateAdmin, adminController.getProfile);
router.put("/update-profile", authenticateAdmin, adminController.updateProfile);
router.put("/change-password", authenticateAdmin, adminController.changePassword);
router.post("/reset-password", adminController.resetPassword);
router.post("/addnew", authenticateAdmin, adminController.addNewAdmin);
router.post("/logout", adminController.logout);
router.get("/me", authenticateAdmin, adminController.me);

module.exports = router;