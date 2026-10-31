import { test, expect, describe, beforeAll, afterAll } from "bun:test";

import { prisma } from "@repo/db/prisma";

// Test suite for Phase 1 Authentication & RBAC
describe("Brightloop Phase 1: Authentication & RBAC", () => {
  const timestamp = Date.now();
  const customerEmail = `customer_${timestamp}@test.com`;
  const staffEmail = `staff_${timestamp}@test.com`;
  const adminEmail = `admin_${timestamp}@test.com`;
  const validPassword = "SecurePassword1!";
  const weakPassword = "short";

  test("Password policy validation check (min 9 chars, uppercase, lowercase, special)", async () => {
    // We can test via the register endpoint or schema
    const res = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: `weak_${timestamp}@test.com`,
        password: weakPassword,
      }),
    });
    expect(res.status).toBe(400);
  });

  test("Customer registration with valid details assigns CUSTOMER role", async () => {
    const res = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Customer",
        email: customerEmail,
        password: validPassword,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.user.role).toBe("CUSTOMER");
  });

  test("Duplicate email registration is rejected", async () => {
    const res = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Customer",
        email: customerEmail,
        password: validPassword,
      }),
    });
    expect(res.status).toBe(400);
  });

  test("Public signup trying to inject ADMIN or STAFF role remains CUSTOMER", async () => {
    const res = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Customer",
        email: `hacker_${timestamp}@test.com`,
        password: validPassword,
        role: "ADMIN",
      } as any),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.user.role).toBe("CUSTOMER");

    const dbUser = await prisma.user.findUnique({ where: { email: `hacker_${timestamp}@test.com` } });
    expect(dbUser?.role).toBe("CUSTOMER");
  });

  test("Accessing protected /api/me without session returns 401", async () => {
    const res = await fetch("http://localhost:4000/api/me");
    expect(res.status).toBe(401);
  });
});
