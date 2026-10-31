import { Request, Response } from "express";
import { createDiscountSchema, updateDiscountSchema, discountQuerySchema } from "./discount.schemas.js";
import * as discountService from "./discount.service.js";

export async function createDiscountController(req: Request, res: Response) {
  const validation = createDiscountSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const discount = await discountService.createDiscount({
      ...validation.data,
      startsAt: new Date(validation.data.startsAt),
      endsAt: new Date(validation.data.endsAt),
    });
    return res.status(201).json({ message: "Discount created successfully", discount });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function updateDiscountController(req: Request, res: Response) {
  const { discountId } = req.params;
  if (!discountId) return res.status(400).json({ error: "Invalid discount ID" });

  const validation = updateDiscountSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const updateData: any = { ...validation.data };
    if (validation.data.startsAt) updateData.startsAt = new Date(validation.data.startsAt);
    if (validation.data.endsAt) updateData.endsAt = new Date(validation.data.endsAt);

    const discount = await discountService.updateDiscount(discountId, updateData);
    return res.json({ message: "Discount updated successfully", discount });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getDiscountsController(req: Request, res: Response) {
  const validation = discountQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await discountService.getDiscounts(validation.data);
  return res.json(result);
}

export async function getDiscountByIdController(req: Request, res: Response) {
  const { discountId } = req.params;
  if (!discountId) return res.status(400).json({ error: "Invalid discount ID" });

  const discount = await discountService.getDiscountById(discountId);
  if (!discount) return res.status(404).json({ error: "Discount not found" });

  return res.json({ discount });
}

export async function applyDiscountController(req: Request, res: Response) {
  const { invoiceId } = req.params;
  const { discountId } = req.body;
  if (!invoiceId || !discountId) {
    return res.status(400).json({ error: "Invoice ID and discount ID are required" });
  }

  try {
    const invoice = await discountService.applyDiscountToInvoice(invoiceId, discountId);
    return res.json({ message: "Discount applied successfully", invoice });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
