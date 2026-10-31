import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root when running scripts outside apps/api
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { prisma } from "@repo/db";
import { auth } from "../apps/api/src/modules/auth/auth.js";

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@brightloop.com";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "AdminPass123!";
  const adminName = process.env.INITIAL_ADMIN_NAME || "System Administrator";

  console.log(`Checking for existing admin account (${adminEmail})...`);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
      console.log(`Existing user ${adminEmail} updated to ADMIN role.`);
    } else {
      console.log(`Admin account ${adminEmail} already exists and is an ADMIN. Skipping creation.`);
    }
    return;
  }

  console.log(`Creating initial admin account (${adminEmail})...`);

  try {
    const response = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: "ADMIN",
      } as any,
    });

    // Ensure role is explicitly set to ADMIN
    await prisma.user.update({
      where: { id: response.user.id },
      data: { role: "ADMIN" },
    });

    console.log(`Initial administrator successfully provisioned: ${adminEmail} (ID: ${response.user.id})`);
  } catch (error: any) {
    console.error("Failed to provision initial admin:", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
