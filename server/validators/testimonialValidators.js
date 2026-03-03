const { z } = require("zod");

exports.submitTestimonialSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  authorName: z.string().min(1, "Author name is required").max(80),
  authorRole: z.string().max(80).optional(),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().max(120).optional(),
  message: z.string().min(20, "Review message must be at least 20 characters").max(1200),
  email: z.string().max(200).optional(),
  consentToPublish: z.literal(true, { errorMap: () => ({ message: "You must consent to publish your review." }) }),
  website: z.string().optional(),
});
