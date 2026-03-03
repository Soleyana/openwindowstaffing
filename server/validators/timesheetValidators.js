const { z } = require("zod");

const entrySchema = z.object({
  date: z.union([z.string(), z.date()]).optional(),
  hours: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(500).optional(),
});

exports.createTimesheetSchema = z.object({
  assignmentId: z.string().min(1, "assignmentId is required"),
  periodStart: z.string().min(1, "periodStart is required"),
  periodEnd: z.string().min(1, "periodEnd is required"),
  entries: z.array(entrySchema).optional(),
});
