import { test, expect, describe } from "bun:test";
import { prisma } from "@repo/db/prisma";
import { auth } from "../src/modules/auth/auth.js";

describe("Brightloop Phase 4: Invoice & Tax MVP", () => {
  const timestamp = Date.now();
  const adminEmail = `admin_inv_${timestamp}@test.com`;
  const staffEmail = `staff_inv_${timestamp}@test.com`;
  const customerEmail = `customer_inv_${timestamp}@test.com`;
  const password = "SecurePassword1!";

  let adminCookie = "";
  let staffCookie = "";
  let customerCookie = "";
  let customerId = "";
  let productId = "";
  let planId = "";
  let subscriptionId = "";
  let invoiceId = "";

  test("Setup test users, active subscription", async () => {
    // 1. Admin
    const adminReg = await auth.api.signUpEmail({
      body: { email: adminEmail, password, name: "Admin Inv", role: "ADMIN" } as any,
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

    // 2. Staff
    const staffReg = await auth.api.signUpEmail({
      body: { email: staffEmail, password, name: "Staff Inv", role: "STAFF" } as any,
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

    // 3. Customer
    const custReg = await auth.api.signUpEmail({
      body: { email: customerEmail, password, name: "Customer Inv", role: "CUSTOMER" } as any,
    });
    customerId = custReg.user.id;
    await prisma.user.update({
      where: { id: customerId },
      data: { emailVerified: true },
    });
    const custSignIn = await fetch("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password }),
    });
    customerCookie = custSignIn.headers.get("set-cookie") || "";

    // 4. Product, Plan, and Active Subscription
    const product = await prisma.product.create({
      data: {
        name: "Cloud Compute Server",
        type: "SOFTWARE",
        salesPrice: 1000.00,
        costPrice: 500.00,
      },
    });
    productId = product.id;

    const plan = await prisma.plan.create({
      data: {
        productId,
        name: "Monthly Compute Plan",
        price: 1000.00,
        billingInterval: "MONTHLY",
      },
    });
    planId = plan.id;

    // Create and activate subscription directly
    const subscription = await prisma.subscription.create({
      data: {
        number: `SUB-TEST-${timestamp}`,
        customerId,
        planId,
        createdById: adminReg.user.id,
        status: "ACTIVE",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planNameSnapshot: plan.name,
        planPriceSnapshot: plan.price,
        billingIntervalSnapshot: plan.billingInterval,
        subtotal: 1000.00,
        taxTotal: 0,
        total: 1000.00,
        activatedAt: new Date(),
        items: {
          create: {
            productId,
            descriptionSnapshot: "Cloud Compute Server - Monthly",
            quantity: 1,
            unitPrice: 1000.00,
            taxRateSnapshot: 0,
            taxAmount: 0,
            lineSubtotal: 1000.00,
            lineTotal: 1000.00,
          },
        },
      },
    });
    subscriptionId = subscription.id;

    expect(adminCookie).toBeTruthy();
    expect(staffCookie).toBeTruthy();
    expect(customerCookie).toBeTruthy();
    expect(subscriptionId).toBeTruthy();
  });

  test("Staff can generate invoice from active subscription with tax", async () => {
    const billingPeriodStart = new Date().toISOString().slice(0, 10);
    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await fetch("http://localhost:4000/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({
        subscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        dueDate,
        taxRate: 10.00, // 10% tax
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    invoiceId = data.invoice.id;
    expect(data.invoice.number).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(data.invoice.subtotal).toBe("1000.00");
    expect(data.invoice.taxTotal).toBe("100.00");
    expect(data.invoice.total).toBe("1100.00");
    expect(data.invoice.status).toBe("CONFIRMED");
  });

  test("Generating duplicate invoice for same subscription billing period returns existing invoice without error", async () => {
    const billingPeriodStart = new Date().toISOString().slice(0, 10);
    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await fetch("http://localhost:4000/api/invoices/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({
        subscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        dueDate,
        taxRate: 10.00,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.invoice.id).toBe(invoiceId);
    expect(data.message).toMatch(/already exists/i);
  });

  test("Customer can view their own invoices", async () => {
    const res = await fetch("http://localhost:4000/api/me/invoices", {
      method: "GET",
      headers: {
        "Cookie": customerCookie,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.length).toBe(1);
    expect(data.data[0].id).toBe(invoiceId);
  });
});
