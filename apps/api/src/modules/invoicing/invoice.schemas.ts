import { z } from "zod";

export const generateInvoiceSchema = z.object({
  subscriptionId: z.string().uuid("Valid subscription ID is required"),
  billingPeriodStart: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  billingPeriodEnd: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  taxRate: z.number().nonnegative().default(0),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DRAFT", "CONFIRMED", "PAID", "CANCELLED"]).optional(),
  customerId: z.string().optional(),
  subscriptionId: z.string().uuid().optional(),
});
