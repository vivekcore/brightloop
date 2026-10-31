import { Request, Response } from "express";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createVariantSchema,
  updateVariantSchema,
  createPlanSchema,
  updatePlanSchema,
  planQuerySchema,
} from "./product.schemas.js";

import * as productService from "./product.service.js";

// Products Controllers
export async function createProductController(req: Request, res: Response) {
  const validation = createProductSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const product = await productService.createProduct(validation.data);
  return res.status(201).json({
    message: "Product created successfully",
    product,
  });
}

export async function getProductsController(req: Request, res: Response) {
  const validation = productQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await productService.getProducts(validation.data);
  return res.json(result);
}

export async function getProductByIdController(req: Request, res: Response) {
  const { productId } = req.params;
   if(!productId || typeof productId !== "string"){
    return;
  }
  const isCustomer = req.user?.role === "CUSTOMER";

  const product = await productService.getProductById(productId, !isCustomer);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  return res.json({ product });
}

export async function updateProductController(req: Request, res: Response) {
  const { productId } = req.params;
  if(!productId || typeof productId !== "string"){
    return;
  }
  const validation = updateProductSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const existing = await productService.getProductById(productId);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  const product = await productService.updateProduct(productId, validation.data);
  return res.json({
    message: "Product updated successfully",
    product,
  });
}

export async function archiveProductController(req: Request, res: Response) {
  const { productId } = req.params;
    if(!productId || typeof productId !== "string"){
    return;
  }
  const existing = await productService.getProductById(productId);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  const product = await productService.archiveProduct(productId);
  return res.json({
    message: "Product archived successfully",
    product,
  });
}

// Variants Controllers
export async function createVariantController(req: Request, res: Response) {
  const { productId } = req.params;
    if(!productId || typeof productId !== "string"){
    return;
  }
  const product = await productService.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const validation = createVariantSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const variant = await productService.createVariant(productId, validation.data);
    return res.status(201).json({
      message: "Variant created successfully",
      variant,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Duplicate variant attribute and value for this product" });
    }
    throw error;
  }
}

export async function getVariantsController(req: Request, res: Response) {
  const { productId } = req.params;
    if(!productId || typeof productId !== "string"){
    return;
  }
  const product = await productService.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const variants = await productService.getVariants(productId);
  return res.json({ variants });
}

export async function updateVariantController(req: Request, res: Response) {
  const { productId, variantId } = req.params;
     if((!productId || typeof productId !== "string") || (!variantId || typeof variantId !== "string")){
    return;
  }
  const validation = updateVariantSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  try {
    const variant = await productService.updateVariant(variantId, productId, validation.data);
    return res.json({
      message: "Variant updated successfully",
      variant,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Duplicate variant attribute and value for this product" });
    }
    throw error;
  }
}

export async function deactivateVariantController(req: Request, res: Response) {
  const { productId, variantId } = req.params;
    if((!productId || typeof productId !== "string") || (!variantId || typeof variantId !== "string")){
    return;
  }
  try {
    const variant = await productService.deactivateVariant(variantId, productId);
    return res.json({
      message: "Variant deactivated successfully",
      variant,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}

// Plans Controllers
export async function createPlanController(req: Request, res: Response) {
  const validation = createPlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const product = await productService.getProductById(validation.data.productId);
  if (!product) {
    return res.status(404).json({ error: "Referenced product not found" });
  }

  const plan = await productService.createPlan(validation.data);
  return res.status(201).json({
    message: "Plan created successfully",
    plan,
  });
}

export async function getPlansController(req: Request, res: Response) {
  const validation = planQuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const result = await productService.getPlans(validation.data);
  return res.json(result);
}

export async function getPlanByIdController(req: Request, res: Response) {
  const { planId } = req.params;
    if(!planId || typeof planId !== "string"){
    return;
  }
  const plan = await productService.getPlanById(planId);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }

  return res.json({ plan });
}

export async function updatePlanController(req: Request, res: Response) {
  const { planId } = req.params;
    if(!planId || typeof planId !== "string"){
    return;
  }
  const validation = updatePlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const existing = await productService.getPlanById(planId);
  if (!existing) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const plan = await productService.updatePlan(planId, validation.data);
  return res.json({
    message: "Plan updated successfully",
    plan,
  });
}

export async function archivePlanController(req: Request, res: Response) {
  const { planId } = req.params;
    if(!planId || typeof planId !== "string"){
    return;
  }
  const existing = await productService.getPlanById(planId);
  if (!existing) {
    return res.status(404).json({ error: "Plan not found" });
  }

  const plan = await productService.archivePlan(planId);
  return res.json({
    message: "Plan archived successfully",
    plan,
  });
}
