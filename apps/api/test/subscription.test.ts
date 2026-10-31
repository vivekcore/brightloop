import { test, expect, describe } from "bun:test";
import { prisma } from "@repo/db/prisma";
import { auth } from "../src/modules/auth/auth.js";

describe("Brightloop Phase 3: Quotation & Subscription Management", () => {
  const timestamp = Date.now();
  const adminEmail = `admin_sub_${timestamp}@test.com`;
  const staffEmail = `staff_sub_${timestamp}@test.com`;
  const customerEmail = `customer_sub_${timestamp}@test.com`;
  const password = "SecurePassword1!";

  let adminCookie = "";
  let staffCookie = "";
  let customerCookie = "";
  let customerId = "";
  let productId = "";
  let planId = "";
  let templateId = "";
  let subscriptionId = "";

  test("Setup test users, product, and plan", async () => {
    // 1. Admin
    const adminReg = await auth.api.signUpEmail({
      body: { email: adminEmail, password, name: "Admin Sub", role: "ADMIN" } as any,
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
      body: { email: staffEmail, password, name: "Staff Sub", role: "STAFF" } as any,
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
      body: { email: customerEmail, password, name: "Customer Sub", role: "CUSTOMER" } as any,
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

    // 4. Create Product & Plan
    const product = await prisma.product.create({
      data: {
        name: "Enterprise Hosting",
        type: "SOFTWARE",
        salesPrice: 2000.00,
        costPrice: 1000.00,
      },
    });
    productId = product.id;

    const plan = await prisma.plan.create({
      data: {
        productId,
        name: "Annual Dedicated Plan",
        price: 24000.00,
        billingInterval: "YEARLY",
        allowEarlyClose: true,
        allowPause: true,
        allowRenewal: true,
      },
    });
    planId = plan.id;

    expect(adminCookie).toBeTruthy();
    expect(staffCookie).toBeTruthy();
    expect(customerCookie).toBeTruthy();
  });

  test("Admin can create quotation template with items", async () => {
    const res = await fetch("http://localhost:4000/api/quotation-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": adminCookie,
      },
      body: JSON.stringify({
        name: "Standard Hosting Quote Template",
        description: "Standard yearly quote template",
        planId,
        validityDays: 15,
        items: [
          {
            productId,
            quantity: 1,
            unitPrice: 24000.00,
            sortOrder: 0,
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    templateId = data.template.id;
    expect(data.template.name).toBe("Standard Hosting Quote Template");
    expect(data.template.validityDays).toBe(15);
    expect(data.template.items.length).toBe(1);
  });

  test("Staff can create draft subscription from template", async () => {
    const startDate = new Date().toISOString().slice(0, 10);
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const res = await fetch("http://localhost:4000/api/subscriptions/from-template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({
        customerId,
        quotationTemplateId: templateId,
        startDate,
        expiryDate,
        paymentTermsDays: 30,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    subscriptionId = data.subscription.id;
    expect(data.subscription.status).toBe("DRAFT");
    expect(data.subscription.number).toMatch(/^SUB-\d{8}-\d{4}$/);
    expect(data.subscription.total).toBe("24000.00");
  });

  test("Staff can issue quotation from draft", async () => {
    const res = await fetch(`http://localhost:4000/api/subscriptions/${subscriptionId}/issue-quotation`, {
      method: "POST",
      headers: {
        "Cookie": staffCookie,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.subscription.status).toBe("QUOTATION");
    expect(data.subscription.quotationValidUntil).toBeTruthy();
  });

  test("Customer can view and accept their own quotation", async () => {
    const listRes = await fetch("http://localhost:4000/api/me/subscriptions", {
      method: "GET",
      headers: {
        "Cookie": customerCookie,
      },
    });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    expect(listData.data.length).toBe(1);

    const acceptRes = await fetch(`http://localhost:4000/api/me/subscriptions/${subscriptionId}/accept`, {
      method: "POST",
      headers: {
        "Cookie": customerCookie,
      },
    });
    expect(acceptRes.status).toBe(200);
    const acceptData = await acceptRes.json() as any;
    expect(acceptData.subscription.status).toBe("CONFIRMED");
  });

  test("Staff can activate confirmed subscription", async () => {
    const res = await fetch(`http://localhost:4000/api/subscriptions/${subscriptionId}/activate`, {
      method: "POST",
      headers: {
        "Cookie": staffCookie,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.subscription.status).toBe("ACTIVE");
    expect(data.subscription.activatedAt).toBeTruthy();
  });

  test("Staff can pause and resume active subscription", async () => {
    const pauseRes = await fetch(`http://localhost:4000/api/subscriptions/${subscriptionId}/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({ note: "Client requested temporary maintenance hold" }),
    });
    expect(pauseRes.status).toBe(200);
    const pauseData = await pauseRes.json() as any;
    expect(pauseData.subscription.isPaused).toBe(true);

    const resumeRes = await fetch(`http://localhost:4000/api/subscriptions/${subscriptionId}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({ note: "Maintenance completed" }),
    });
    expect(resumeRes.status).toBe(200);
    const resumeData = await resumeRes.json() as any;
    expect(resumeData.subscription.isPaused).toBe(false);
  });

  test("Staff can close active subscription with early close allowed", async () => {
    const res = await fetch(`http://localhost:4000/api/subscriptions/${subscriptionId}/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": staffCookie,
      },
      body: JSON.stringify({ reason: "Client upgraded to custom contract" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.subscription.status).toBe("CLOSED");
    expect(data.subscription.closeReason).toBe("Client upgraded to custom contract");
  });
});
