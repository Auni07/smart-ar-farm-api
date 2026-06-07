const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminAuthController");

router.post("/login", adminController.login);
router.post("/addnew", adminController.addNewAdmin);

module.exports = router;