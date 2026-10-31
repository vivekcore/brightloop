import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";

const globalprisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalprisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalprisma.prisma = prisma;
}
