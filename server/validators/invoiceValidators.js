const { z } = require("zod");

exports.requestInvoiceSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  message: z.string().max(2000).optional(),
});

exports.generateInvoiceSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  from: z.string().min(1, "from date is required"),
  to: z.string().min(1, "to date is required"),
});
