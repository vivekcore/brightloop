import { z } from "zod";

export const createQuotationTemplateItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative().optional(),
  sortOrder: z.number().int().default(0),
});

export const createQuotationTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  planId: z.string().uuid("Valid plan ID is required"),
  validityDays: z.number().int().min(1, "Validity days must be at least 1").default(30),
  isActive: z.boolean().default(true),
  items: z.array(createQuotationTemplateItemSchema).default([]),
});

export const updateQuotationTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  planId: z.string().uuid().optional(),
  validityDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  items: z.array(createQuotationTemplateItemSchema).optional(),
});

export const quotationTemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  planId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const createSubscriptionItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  taxRateSnapshot: z.number().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  planId: z.string().uuid("Valid plan ID is required"),
  quotationTemplateId: z.string().uuid().optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  paymentTermsDays: z.number().int().nonnegative().default(0),
  currency: z.string().default("USD"),
  items: z.array(createSubscriptionItemSchema).min(1, "At least one item is required"),
});

export const createSubscriptionFromTemplateSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  quotationTemplateId: z.string().uuid("Valid template ID is required"),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")),
  paymentTermsDays: z.number().int().nonnegative().optional(),
  currency: z.string().default("USD"),
});

export const updateSubscriptionSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  paymentTermsDays: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  items: z.array(createSubscriptionItemSchema).optional(),
});

export const subscriptionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"]).optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().optional(),
  isPaused: z.coerce.boolean().optional(),
});
