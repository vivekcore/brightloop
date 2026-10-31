import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(9, "Password must be at least 9 characters long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

export const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});
