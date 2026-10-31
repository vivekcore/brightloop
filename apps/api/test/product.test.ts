import { test, expect, describe } from "bun:test";
import { prisma } from "@repo/db/prisma";
import { auth } from "../src/modules/auth/auth.js";

describe("Brightloop Phase 2: Product & Plan Management", () => {
  const timestamp = Date.now();
  const adminEmail = `admin_catalog_${timestamp}@test.com`;
  const staffEmail = `staff_catalog_${timestamp}@test.com`;
  const customerEmail = `customer_catalog_${timestamp}@test.com`;
  const password = "SecurePassword1!";

  let adminCookie = "";
  let staffCookie = "";
  let customerCookie = "";
  let createdProductId = "";
  let createdVariantId = "";
  let createdPlanId = "";

  test("Setup test users and sign-in cookies", async () => {
    // 1. Create Admin user & session via better-auth or direct db + auth signin
    const adminReg = await auth.api.signUpEmail({
      body: { email: adminEmail, password, name: "Admin Catalog", role: "ADMIN" } as any,
    });
    await prisma.user.update({
      where: { id: adminReg.user.id },
      data: { role: "ADMIN", emailVerified: true },
    });

    const adminSignIn = await fetch("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    adminCookie = adminSignIn.headers.get("set-cookie") || "";

    // 2. Create Staff user & session
    const staffReg = await auth.api.signUpEmail({
      body: { email: staffEmail, password, name: "Staff Catalog", role: "STAFF" } as any,
    });
    await prisma.user.update({
      where: { id: staffReg.user.id },
      data: { role: "STAFF", emailVerified: true },
    });

    const staffSignIn = await fetch("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: staffEmail, password }),
    });
    staffCookie = staffSignIn.headers.get("set-cookie") || "";

    // 3. Create Customer user & session
    const custReg = await auth.api.signUpEmail({
      body: { email: customerEmail, password, name: "Customer Catalog", role: "CUSTOMER" } as any,
    });
    await prisma.user.update({
      where: { id: custReg.user.id },
      data: { emailVerified: true },
    });

    const custSignIn = await fetch("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password }),
    });
    customerCookie = custSignIn.headers.get("set-cookie") || "";

    expect(adminCookie).toBeTruthy();
    expect(staffCookie).toBeTruthy();
    expect(customerCookie).toBeTruthy();
  });

  test("Admin can create a valid product", async () => {
    const res = await fetch("http://localhost:4000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie,
      },
      body: JSON.stringify({
        name: "Cloud Server Pro",
        type: "SOFTWARE",
        salesPrice: 1500.00,
        costPrice: 800.00,
        notes: "Enterprise cloud subscription",
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    createdProductId = data.product.id;
    expect(data.product.name).toBe("Cloud Server Pro");
    expect(data.product.salesPrice).toBe("1500.00");
  });

  test("Staff cannot create a product (403)", async () => {
    const res = await fetch("http://localhost:4000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({
        name: "Staff Product",
        type: "SOFTWARE",
        salesPrice: 100.00,
        costPrice: 50.00,
      }),
    });
    expect(res.status).toBe(403);
  });

  test("Staff can view products", async () => {
    const res = await fetch("http://localhost:4000/api/products", {
      method: "GET",
      headers: {
        "Cookie": staffCookie,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.length).toBeGreaterThan(0);
  });

  test("Customer can view products but costPrice is omitted", async () => {
    const res = await fetch(`http://localhost:4000/api/products/${createdProductId}`, {
      method: "GET",
      headers: {
        "Cookie": customerCookie,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.product.name).toBe("Cloud Server Pro");
    expect(data.product.costPrice).toBeUndefined();
  });

  test("Admin can add product variant with price adjustment (+560 Odoo example)", async () => {
    const res = await fetch(`http://localhost:4000/api/products/${createdProductId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie,
      },
      body: JSON.stringify({
        attributeName: "Brand",
        value: "Odoo",
        priceAdjustment: 560.00,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    createdVariantId = data.variant.id;
    expect(data.variant.priceAdjustment).toBe("560.00");
  });

  test("Duplicate variant attribute and value is rejected (409)", async () => {
    const res = await fetch(`http://localhost:4000/api/products/${createdProductId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie,
      },
      body: JSON.stringify({
        attributeName: "Brand",
        value: "Odoo",
        priceAdjustment: 100.00,
      }),
    });
    expect(res.status).toBe(409);
  });

  test("Admin can create subscription plan", async () => {
    const res = await fetch("http://localhost:4000/api/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie,
      },
      body: JSON.stringify({
        productId: createdProductId,
        name: "Monthly Pro Plan",
        price: 1500.00,
        billingInterval: "MONTHLY",
        minimumQuantity: 1,
        autoCloseAtEnd: false,
        allowEarlyClose: true,
        allowPause: true,
        allowRenewal: true,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    createdPlanId = data.plan.id;
    expect(data.plan.billingInterval).toBe("MONTHLY");
    expect(data.plan.allowPause).toBe(true);
  });

  test("Staff can view plans", async () => {
    const res = await fetch("http://localhost:4000/api/plans", {
      method: "GET",
      headers: {
        "Cookie": staffCookie,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.length).toBeGreaterThan(0);
  });

  test("Admin can archive product", async () => {
    const res = await fetch(`http://localhost:4000/api/products/${createdProductId}`, {
      method: "DELETE",
      headers: {
        "Cookie": adminCookie,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.product.isActive).toBe(false);
  });
});
