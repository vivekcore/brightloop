import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").trim(),
  type: z.string().min(1, "Product type is required"),
  salesPrice: z.number().nonnegative("Sales price must be >= 0"),
  costPrice: z.number().nonnegative("Cost price must be >= 0"),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  search: z.string().optional(),
  type: z.string().optional(),
  isActive: z.string().optional().transform(val => (val === "true" ? true : val === "false" ? false : undefined)),
  sortBy: z.enum(["name", "salesPrice", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createVariantSchema = z.object({
  attributeName: z.string().min(1, "Attribute name is required").trim(),
  value: z.string().min(1, "Variant value is required").trim(),
  priceAdjustment: z.number().optional().default(0),
  isActive: z.boolean().optional(),
});

export const updateVariantSchema = createVariantSchema.partial();

export const createPlanSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  name: z.string().min(1, "Plan name is required").trim(),
  price: z.number().nonnegative("Plan price must be >= 0"),
  billingInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  minimumQuantity: z.number().int().min(1, "Minimum quantity must be at least 1").default(1),
  availableFrom: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  availableUntil: z.string().optional().transform(val => (val ? new Date(val) : undefined)),
  autoCloseAtEnd: z.boolean().optional().default(false),
  allowEarlyClose: z.boolean().optional().default(false),
  allowPause: z.boolean().optional().default(false),
  allowRenewal: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
}).refine(data => {
  if (data.availableFrom && data.availableUntil) {
    return data.availableUntil >= data.availableFrom;
  }
  return true;
}, {
  message: "availableUntil cannot be earlier than availableFrom",
  path: ["availableUntil"],
});

export const updatePlanSchema = createPlanSchema.partial().omit({ productId: true }).refine(data => {
  if (data.availableFrom && data.availableUntil) {
    return data.availableUntil >= data.availableFrom;
  }
  return true;
}, {
  message: "availableUntil cannot be earlier than availableFrom",
  path: ["availableUntil"],
});

export const planQuerySchema = z.object({
  page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform(val => (val ? Math.min(parseInt(val, 10), 100) : 50)),
  productId: z.string().uuid().optional(),
  billingInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  isActive: z.string().optional().transform(val => (val === "true" ? true : val === "false" ? false : undefined)),
  availableNow: z.string().optional().transform(val => val === "true"),
  search: z.string().optional(),
});
