import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalprisma = global as unknown as { prisma?: PrismaClient };

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/brightloop?schema=public";

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalprisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalprisma.prisma = prisma;
}
