import { Prisma } from '../generated/prisma/client.js';

export { prisma } from './prisma.js';
export { ROLES, type UserRole } from './roles.js';
export * from '../generated/prisma/client.js';

export const Decimal = Prisma.Decimal;
