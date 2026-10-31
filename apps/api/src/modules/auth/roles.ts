export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];
