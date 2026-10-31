import { z } from "zod";

export const recordPaymentSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]).default("BANK_TRANSFER"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  paidAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")).optional(),
  note: z.string().optional(),
});

export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  invoiceId: z.string().uuid().optional(),
});
