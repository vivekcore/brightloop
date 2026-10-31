import { Request, Response } from "express";
import { createStaffSchema } from "../auth/auth.schemas.js";
import { createStaffService } from "./staff.service.js";

export async function createStaffController(req: Request, res: Response) {
  const validation = createStaffSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

  const staff = await createStaffService(validation.data);

  return res.status(201).json({
    message: "Staff account created successfully",
    staff,
  });
}
