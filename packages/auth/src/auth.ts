import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 9,
    revokeSessionsOnPasswordReset: true,

    sendResetPassword: async ({ user, url }) => {
      console.log(`Reset password for ${user.email}: ${url}`);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
        input: false,
      },
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
});