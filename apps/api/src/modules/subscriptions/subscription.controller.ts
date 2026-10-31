import { Request, Response } from "express";
import {
  createSubscriptionSchema,
  createSubscriptionFromTemplateSchema,
  updateSubscriptionSchema,
  subscriptionQuerySchema,
} from "./subscription.schemas.js";
import * as subscriptionService from "./subscription.service.js";
import { prisma } from "@repo/db";

export async function createSubscriptionController(req: Request, res: Response) {
  const validation = createSubscriptionSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  // Verify customer exists and is a CUSTOMER
  const customer = await (prisma as any).user.findUnique({
    where: { id: validation.data.customerId },
  });
  if (!customer || customer.role !== "CUSTOMER") {
    return res.status(400).json({ error: "Invalid customer ID or user is not a customer" });
  }

  // Verify plan exists
  const plan = await (prisma as any).plan.findUnique({
    where: { id: validation.data.planId },
  });
  if (!plan) {
    return res.status(404).json({ error: "Referenced plan not found" });
  }

  try {
    const subscription = await subscriptionService.createSubscription({
      ...validation.data,
      startDate: new Date(validation.data.startDate),
      expiryDate: new Date(validation.data.expiryDate),
      createdById: req.user!.id,
    });

    return res.status(201).json({
      message: "Subscription draft created successfully",
      subscription,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function createSubscriptionFromTemplateController(req: Request, res: Response) {
  const validation = createSubscriptionFromTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const customer = await (prisma as any).user.findUnique({
    where: { id: validation.data.customerId },
  });
  if (!customer || customer.role !== "CUSTOMER") {
    return res.status(400).json({ error: "Invalid customer ID or user is not a customer" });
  }

  try {
    const subscription = await subscriptionService.createSubscriptionFromTemplate({
      ...validation.data,
      startDate: new Date(validation.data.startDate),
      expiryDate: new Date(validation.data.expiryDate),
      createdById: req.user!.id,
    });

    return res.status(201).json({
      message: "Subscription created from template successfully",
      subscription,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getSubscriptionsController(req: Request, res: Response) {
  const validation = subscriptionQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await subscriptionService.getSubscriptions(validation.data);
  return res.json(result);
}

export async function getSubscriptionByIdController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }

  const isCustomer = req.user?.role === "CUSTOMER";
  const customerId = isCustomer ? req.user?.id : undefined;

  const subscription = await subscriptionService.getSubscriptionById(subscriptionId, customerId);
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  return res.json({ subscription });
}

// Customer Portal Controllers
export async function getMySubscriptionsController(req: Request, res: Response) {
  const customerId = req.user!.id;
  const validation = subscriptionQuerySchema.safeParse({ ...req.query, customerId });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await subscriptionService.getSubscriptions(validation.data);
  return res.json(result);
}

export async function acceptQuotationController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  const customerId = req.user!.id;

  const sub = await subscriptionService.getSubscriptionById(subscriptionId, customerId);
  if (!sub) {
    return res.status(404).json({ error: "Subscription not found or not owned by you" });
  }

  if (sub.status !== "QUOTATION") {
    return res.status(400).json({ error: "Subscription is not awaiting quotation acceptance" });
  }

  if (sub.quotationValidUntil && new Date() > new Date(sub.quotationValidUntil)) {
    return res.status(400).json({ error: "Quotation has expired" });
  }

  try {
    const updated = await subscriptionService.confirmQuotation(subscriptionId, customerId);
    return res.json({
      message: "Quotation accepted successfully",
      subscription: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Action Controllers
export async function issueQuotationController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  try {
    const subscription = await subscriptionService.issueQuotation(subscriptionId, req.user!.id);
    return res.json({ message: "Quotation issued successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function confirmQuotationController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  try {
    const subscription = await subscriptionService.confirmQuotation(subscriptionId, req.user!.id);
    return res.json({ message: "Quotation confirmed successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function activateSubscriptionController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  try {
    const subscription = await subscriptionService.activateSubscription(subscriptionId, req.user!.id);
    return res.json({ message: "Subscription activated successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function closeSubscriptionController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  const { reason } = req.body;
  try {
    const subscription = await subscriptionService.closeSubscription(subscriptionId, req.user!.id, reason);
    return res.json({ message: "Subscription closed successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function pauseSubscriptionController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  const { note } = req.body;
  try {
    const subscription = await subscriptionService.pauseSubscription(subscriptionId, req.user!.id, note);
    return res.json({ message: "Subscription paused successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function resumeSubscriptionController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  const { note } = req.body;
  try {
    const subscription = await subscriptionService.resumeSubscription(subscriptionId, req.user!.id, note);
    return res.json({ message: "Subscription resumed successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function renewSubscriptionController(req: Request, res: Response) {
  const { subscriptionId } = req.params;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({ error: "Invalid subscription ID" });
  }
  const { startDate, expiryDate } = req.body;
  if (!startDate || !expiryDate) {
    return res.status(400).json({ error: "startDate and expiryDate are required for renewal" });
  }

  try {
    const subscription = await subscriptionService.renewSubscription(
      subscriptionId,
      req.user!.id,
      new Date(startDate),
      new Date(expiryDate)
    );
    return res.status(201).json({ message: "Subscription renewed successfully", subscription });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
