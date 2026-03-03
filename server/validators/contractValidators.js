const { z } = require("zod");

exports.createContractSchema = z.object({
  offerId: z.string().min(1, "offerId is required"),
  contractHtml: z.string().max(50000).optional(),
});
