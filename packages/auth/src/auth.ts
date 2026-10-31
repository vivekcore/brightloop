import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {PrismaClient} from "@repo/db/prisma"

export const auth = betterAuth({
    database: prismaAdapter(PrismaClient, {
        provider: "postgresql", 
    }),
    emailAndPassword: {
        enabled: true
    }
});