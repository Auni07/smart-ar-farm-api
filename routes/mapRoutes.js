
const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");

router.post("/visit", mapController.visitMapLocation);

module.exports = router;
