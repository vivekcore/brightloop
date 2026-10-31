import { Request, Response } from "express";
import { generateInvoiceSchema, invoiceQuerySchema } from "./invoice.schemas.js";
import * as invoiceService from "./invoice.service.js";

export async function generateInvoiceController(req: Request, res: Response) {
  const validation = generateInvoiceSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const result = await invoiceService.generateInvoice({
      ...validation.data,
      billingPeriodStart: new Date(validation.data.billingPeriodStart),
      billingPeriodEnd: new Date(validation.data.billingPeriodEnd),
      dueDate: new Date(validation.data.dueDate),
    });

    const statusCode = result.isExisting ? 200 : 201;
    const message = result.isExisting
      ? "Invoice already exists for this billing period"
      : "Invoice generated successfully";

    return res.status(statusCode).json({
      message,
      invoice: result.invoice,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getInvoicesController(req: Request, res: Response) {
  const validation = invoiceQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await invoiceService.getInvoices(validation.data);
  return res.json(result);
}

export async function getInvoiceByIdController(req: Request, res: Response) {
  const { invoiceId } = req.params;
  if (!invoiceId || typeof invoiceId !== "string") {
    return res.status(400).json({ error: "Invalid invoice ID" });
  }

  const isCustomer = req.user?.role === "CUSTOMER";
  const customerId = isCustomer ? req.user?.id : undefined;

  const invoice = await invoiceService.getInvoiceById(invoiceId, customerId);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  return res.json({ invoice });
}

export async function getMyInvoicesController(req: Request, res: Response) {
  const customerId = req.user!.id;
  const validation = invoiceQuerySchema.safeParse({ ...req.query, customerId });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await invoiceService.getInvoices(validation.data);
  return res.json(result);
}
