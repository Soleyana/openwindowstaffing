const express = require("express");
const router = express.Router();
const jobAlertController = require("../controllers/jobAlertController");

router.post("/subscribe", jobAlertController.subscribe);

module.exports = router;
