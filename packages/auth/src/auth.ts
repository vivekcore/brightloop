import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@repo/db/prisma"

export const auth = betterAuth({
    database: prismaAdapter(PrismaClient, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        revokeSessionsOnPasswordReset: true,

        sendResetPassword: async ({ user, url }) => {
            //  Send reset email using Resend
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
});