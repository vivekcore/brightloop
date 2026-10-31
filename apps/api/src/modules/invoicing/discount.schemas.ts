import { z } from "zod";

export const createDiscountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.number().positive("Value must be positive"),
  minimumQuantity: z.number().int().nonnegative().optional(),
  minimumPurchase: z.number().nonnegative().optional(),
  startsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  endsAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  usageLimit: z.number().int().positive().optional(),
});

export const updateDiscountSchema = createDiscountSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const discountQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
