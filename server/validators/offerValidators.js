const { z } = require("zod");

exports.createOfferSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required"),
  facilityId: z.string().optional(),
  payRate: z.union([z.number(), z.string()]).optional(),
  billRate: z.union([z.number(), z.string()]).optional(),
  startDate: z.string().optional(),
  scheduleNotes: z.string().max(2000).optional(),
  contractType: z.string().max(100).optional(),
});
