const express = require("express");
const router = express.Router();
const { requireAuth, requireRecruiter } = require("../middleware/authMiddleware");
const invoiceController = require("../controllers/invoiceController");
const { validateBody } = require("../middleware/validateRequest");
const { requestInvoiceSchema, generateInvoiceSchema } = require("../validators/invoiceValidators");

router.use(requireAuth);
router.use(requireRecruiter);

router.post("/request", validateBody(requestInvoiceSchema), invoiceController.requestInvoice);
router.post("/generate", validateBody(generateInvoiceSchema), invoiceController.generateInvoice);
router.get("/", invoiceController.listInvoices);
router.get("/:id/export", invoiceController.exportInvoice);
router.get("/:id", invoiceController.getInvoice);
router.patch("/:id", invoiceController.updateInvoice);
router.post("/:id/issue", invoiceController.issueInvoice);
router.post("/:id/mark-paid", invoiceController.markPaidInvoice);

module.exports = router;
