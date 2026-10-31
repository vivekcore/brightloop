import { Request, Response } from "express";
import { recordPaymentSchema, paymentQuerySchema } from "./payment.schemas.js";
import * as paymentService from "./payment.service.js";

export async function recordPaymentController(req: Request, res: Response) {
  const { invoiceId } = req.params;
  if (!invoiceId) return res.status(400).json({ error: "Invoice ID is required" });

  const validation = recordPaymentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const result = await paymentService.recordPayment({
      invoiceId,
      ...validation.data,
      paidAt: validation.data.paidAt ? new Date(validation.data.paidAt) : undefined,
      createdById: req.user!.id,
    });

    return res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.payment,
      invoice: result.invoice,
      remainingBalance: result.remainingBalance.toString(),
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getPaymentsController(req: Request, res: Response) {
  const validation = paymentQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await paymentService.getPayments(validation.data);
  return res.json(result);
}
