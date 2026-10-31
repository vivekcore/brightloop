import { prisma, ROLES } from "@repo/db/prisma";
import { auth } from "./auth.js";

export async function registerCustomerService(data: { name: string; email: string; password: string }) {
  const { name, email, password } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const response = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      role: ROLES.CUSTOMER,
    } as any,
  });

  return {
    id: response.user.id,
    email: response.user.email,
    name: response.user.name,
    role: ROLES.CUSTOMER,
  };
}
