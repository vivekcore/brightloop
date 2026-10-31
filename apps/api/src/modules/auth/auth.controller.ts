import { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { signupSchema } from "./auth.schemas.js";
import { registerCustomerService } from "./auth.service.js";

// Better Auth handler endpoint wrapper
export async function handleBetterAuth(req: Request, res: Response) {
  const handler = toNodeHandler(auth);
  return handler(req, res);
}

// Thin controller for customer registration (using catchAsync wrapper in routes)
export async function registerCustomer(req: Request, res: Response) {
  const validation = signupSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const user = await registerCustomerService(validation.data);

  return res.status(201).json({
    message: "Customer registered successfully",
    user,
  });
}

// Thin controller for current user profile
export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ user: req.user });
}
