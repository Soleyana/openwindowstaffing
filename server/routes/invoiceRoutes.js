const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const invoiceController = require("../controllers/invoiceController");

router.use(requireAuth);
router.use(requireRecruiter);

router.post("/request", invoiceController.requestInvoice);

module.exports = router;
