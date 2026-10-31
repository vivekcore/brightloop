import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
const globalprisma = global as unknown as { prisma?: PrismaClient };

function getPrisma() {
  const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
  return new PrismaClient({ adapter });
}
export const prisma = globalprisma.prisma ?? getPrisma();

if (process.env.NODE_ENV !== "production") {
  globalprisma.prisma = prisma;
}