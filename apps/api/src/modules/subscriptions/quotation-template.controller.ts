import { Request, Response } from "express";
import {
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
  quotationTemplateQuerySchema,
} from "./subscription.schemas.js";
import * as templateService from "./quotation-template.service.js";
import { prisma } from "@repo/db";

export async function createQuotationTemplateController(req: Request, res: Response) {
  const validation = createQuotationTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  // Verify plan exists
  const plan = await (prisma as any).plan.findUnique({
    where: { id: validation.data.planId },
  });
  if (!plan) {
    return res.status(404).json({ error: "Referenced plan not found" });
  }

  const template = await templateService.createQuotationTemplate(validation.data);
  return res.status(201).json({
    message: "Quotation template created successfully",
    template,
  });
}

export async function getQuotationTemplatesController(req: Request, res: Response) {
  const validation = quotationTemplateQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await templateService.getQuotationTemplates(validation.data);
  return res.json(result);
}

export async function getQuotationTemplateByIdController(req: Request, res: Response) {
  const { templateId } = req.params;
  if (!templateId || typeof templateId !== "string") {
    return res.status(400).json({ error: "Invalid template ID" });
  }

  const template = await templateService.getQuotationTemplateById(templateId);
  if (!template) {
    return res.status(404).json({ error: "Quotation template not found" });
  }

  return res.json({ template });
}

export async function updateQuotationTemplateController(req: Request, res: Response) {
  const { templateId } = req.params;
  if (!templateId || typeof templateId !== "string") {
    return res.status(400).json({ error: "Invalid template ID" });
  }

  const validation = updateQuotationTemplateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const existing = await templateService.getQuotationTemplateById(templateId);
  if (!existing) {
    return res.status(404).json({ error: "Quotation template not found" });
  }

  if (validation.data.planId) {
    const plan = await (prisma as any).plan.findUnique({
      where: { id: validation.data.planId },
    });
    if (!plan) {
      return res.status(404).json({ error: "Referenced plan not found" });
    }
  }

  const template = await templateService.updateQuotationTemplate(templateId, validation.data);
  return res.json({
    message: "Quotation template updated successfully",
    template,
  });
}

export async function archiveQuotationTemplateController(req: Request, res: Response) {
  const { templateId } = req.params;
  if (!templateId || typeof templateId !== "string") {
    return res.status(400).json({ error: "Invalid template ID" });
  }

  const existing = await templateService.getQuotationTemplateById(templateId);
  if (!existing) {
    return res.status(404).json({ error: "Quotation template not found" });
  }

  const template = await templateService.archiveQuotationTemplate(templateId);
  return res.json({
    message: "Quotation template archived successfully",
    template,
  });
}
