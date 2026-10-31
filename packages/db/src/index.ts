// Single export point for the @repo/db package.
// Auth and API packages should import the singleton prisma instance, not the bare class.
export { prisma } from './prisma.js';
export { ROLES, type UserRole } from './roles.js';

// Re-export the generated PrismaClient class for the rare cases that need it
// (e.g. typing, tests).
export { PrismaClient } from '../generated/client/index.js';
