const express = require("express");
const router = express.Router();
const plantCareController = require("../controllers/plantCareController");

router.get("/watering/:user_id",plantCareController.getUserWateringRecords);
router.get("/collection/:user_id",plantCareController.getUserCollectionRecords);
router.post("/collection",plantCareController.addCollection);
router.post("/watering",plantCareController.addWateringRecord);

module.exports = router;