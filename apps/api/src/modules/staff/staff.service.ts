import { prisma, ROLES } from "@repo/db";
import { auth } from "../auth/auth.js";

export async function createStaffService(data: { name: string; email: string; password: string }) {
  const { name, email, password } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const user = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      role: ROLES.STAFF,
    } as any,
  });

  await prisma.user.update({
    where: { id: user.user.id },
    data: { role: ROLES.STAFF },
  });

  return {
    id: user.user.id,
    email,
    name,
    role: ROLES.STAFF,
  };
}
