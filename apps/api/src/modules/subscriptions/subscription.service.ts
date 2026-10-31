import { prisma, Decimal } from "@repo/db";

// Helper to generate unique subscription numbers: SUB-YYYYMMDD-XXXX
export async function generateSubscriptionNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `SUB-${dateStr}-`;

  // Find latest subscription with this prefix
  const latest = await (prisma as any).subscription.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let seq = 1;
  if (latest && latest.number) {
    const parts = latest.number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${seq.toString().padStart(4, "0")}`;
}

export async function createSubscription(data: {
  customerId: string;
  planId: string;
  createdById: string;
  quotationTemplateId?: string;
  startDate: Date;
  expiryDate: Date;
  paymentTermsDays?: number;
  currency?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRateSnapshot?: number;
  }>;
}) {
  const plan = await (prisma as any).plan.findUnique({
    where: { id: data.planId },
    include: { product: true },
  });
  if (!plan) throw new Error("Plan not found");

  const number = await generateSubscriptionNumber();

  // Calculate items and totals
  let subtotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  const processedItems = data.items.map((item, index) => {
    const qty = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const taxRate = new Decimal(item.taxRateSnapshot ?? 0);

    const lineSubtotal = qty.mul(unitPrice);
    const taxAmount = lineSubtotal.mul(taxRate).div(100);
    const lineTotal = lineSubtotal.add(taxAmount);

    subtotal = subtotal.add(lineSubtotal);
    taxTotal = taxTotal.add(taxAmount);

    return {
      productId: item.productId,
      variantId: item.variantId ?? null,
      descriptionSnapshot: item.description ?? plan.product.name,
      variantSnapshot: null,
      quantity: item.quantity,
      unitPrice,
      taxRateSnapshot: taxRate,
      taxAmount,
      lineSubtotal,
      lineTotal,
      sortOrder: index,
    };
  });

  const total = subtotal.add(taxTotal);

  return prisma.$transaction(async (tx) => {
    const subscription = await (tx as any).subscription.create({
      data: {
        number,
        customerId: data.customerId,
        planId: data.planId,
        quotationTemplateId: data.quotationTemplateId ?? null,
        createdById: data.createdById,
        status: "DRAFT",
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        paymentTermsDays: data.paymentTermsDays ?? 0,
        planNameSnapshot: plan.name,
        planPriceSnapshot: plan.price,
        billingIntervalSnapshot: plan.billingInterval,
        currency: data.currency ?? "USD",
        subtotal,
        taxTotal,
        total,
        items: {
          create: processedItems,
        },
        events: {
          create: {
            actorId: data.createdById,
            eventType: "CREATED",
            toStatus: "DRAFT",
            note: "Draft subscription created",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });

    return subscription;
  });
}

export async function createSubscriptionFromTemplate(data: {
  customerId: string;
  quotationTemplateId: string;
  createdById: string;
  startDate: Date;
  expiryDate: Date;
  paymentTermsDays?: number;
  currency?: string;
}) {
  const template = await (prisma as any).quotationTemplate.findUnique({
    where: { id: data.quotationTemplateId },
    include: {
      plan: { include: { product: true } },
      items: { include: { product: true } },
    },
  });

  if (!template || !template.isActive) {
    throw new Error("Quotation template not found or inactive");
  }

  const items = template.items.map((ti: any) => ({
    productId: ti.productId,
    variantId: ti.variantId,
    description: ti.description || ti.product.name,
    quantity: ti.quantity,
    unitPrice: ti.unitPrice ? Number(ti.unitPrice) : Number(template.plan.price),
    taxRateSnapshot: 0,
  }));

  return createSubscription({
    customerId: data.customerId,
    planId: template.planId,
    createdById: data.createdById,
    quotationTemplateId: template.id,
    startDate: data.startDate,
    expiryDate: data.expiryDate,
    paymentTermsDays: data.paymentTermsDays ?? 0,
    currency: data.currency ?? "USD",
    items,
  });
}

export async function getSubscriptions(query: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  planId?: string;
  customerId?: string;
  isPaused?: boolean;
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};

  if (query.search) {
    where.OR = [
      { number: { contains: query.search, mode: "insensitive" } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
      { customer: { email: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.planId) {
    where.planId = query.planId;
  }
  if (query.customerId) {
    where.customerId = query.customerId;
  }
  if (query.isPaused !== undefined) {
    where.isPaused = query.isPaused;
  }

  const [total, data] = await Promise.all([
    (prisma as any).subscription.count({ where }),
    (prisma as any).subscription.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        plan: { include: { product: true } },
        createdBy: true,
      },
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getSubscriptionById(id: string, customerId?: string) {
  const where: any = { id };
  if (customerId) {
    where.customerId = customerId;
  }

  return (prisma as any).subscription.findFirst({
    where,
    include: {
      customer: true,
      plan: { include: { product: true } },
      createdBy: true,
      items: { include: { product: true } },
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      quotationTemplate: true,
    },
  });
}

// Lifecycle transitions
export async function issueQuotation(subscriptionId: string, actorId: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
    include: { quotationTemplate: true },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "DRAFT") throw new Error("Only draft subscriptions can be issued as quotations");

  const validityDays = sub.quotationTemplate?.validityDays ?? 30;
  const now = new Date();
  const quotationValidUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "QUOTATION",
        quotationIssuedAt: now,
        quotationValidUntil,
        events: {
          create: {
            actorId,
            eventType: "QUOTATION_ISSUED",
            fromStatus: "DRAFT",
            toStatus: "QUOTATION",
            note: `Quotation issued, valid until ${quotationValidUntil.toISOString()}`,
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function confirmQuotation(subscriptionId: string, actorId: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "QUOTATION") throw new Error("Subscription is not in quotation status");

  if (sub.quotationValidUntil && new Date() > new Date(sub.quotationValidUntil)) {
    throw new Error("Quotation has expired");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        events: {
          create: {
            actorId,
            eventType: "CONFIRMED",
            fromStatus: "QUOTATION",
            toStatus: "CONFIRMED",
            note: "Quotation confirmed",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function activateSubscription(subscriptionId: string, actorId: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "CONFIRMED") throw new Error("Only confirmed subscriptions can be activated");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        activatedAt: now,
        events: {
          create: {
            actorId,
            eventType: "ACTIVATED",
            fromStatus: "CONFIRMED",
            toStatus: "ACTIVE",
            note: "Subscription activated",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function closeSubscription(subscriptionId: string, actorId: string, reason?: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status === "CLOSED") throw new Error("Subscription is already closed");
  if (sub.status !== "ACTIVE" && sub.status !== "CONFIRMED") {
    throw new Error("Only active or confirmed subscriptions can be closed");
  }

  // Check early close if active
  const now = new Date();
  if (sub.status === "ACTIVE" && now < new Date(sub.expiryDate)) {
    if (!sub.plan.allowEarlyClose) {
      throw new Error("Early closure is not allowed for this plan");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CLOSED",
        closedAt: now,
        closeReason: reason ?? null,
        isPaused: false,
        events: {
          create: {
            actorId,
            eventType: "CLOSED",
            fromStatus: sub.status,
            toStatus: "CLOSED",
            note: reason ? `Closed: ${reason}` : "Subscription closed",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function pauseSubscription(subscriptionId: string, actorId: string, note?: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "ACTIVE") throw new Error("Only active subscriptions can be paused");
  if (!sub.plan.allowPause) throw new Error("Pausing is not allowed for this plan");
  if (sub.isPaused) throw new Error("Subscription is already paused");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        isPaused: true,
        pausedAt: now,
        events: {
          create: {
            actorId,
            eventType: "PAUSED",
            fromStatus: "ACTIVE",
            toStatus: "ACTIVE",
            note: note ?? "Subscription paused",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function resumeSubscription(subscriptionId: string, actorId: string, note?: string) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "ACTIVE") throw new Error("Only active subscriptions can be resumed");
  if (!sub.isPaused) throw new Error("Subscription is not paused");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await (tx as any).subscription.update({
      where: { id: subscriptionId },
      data: {
        isPaused: false,
        resumedAt: now,
        events: {
          create: {
            actorId,
            eventType: "RESUMED",
            fromStatus: "ACTIVE",
            toStatus: "ACTIVE",
            note: note ?? "Subscription resumed",
          },
        },
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
        items: { include: { product: true } },
        events: { include: { actor: true } },
      },
    });
    return updated;
  });
}

export async function renewSubscription(subscriptionId: string, actorId: string, newStartDate: Date, newExpiryDate: Date) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: { include: { product: true } },
      items: true,
    },
  });
  if (!sub) throw new Error("Subscription not found");
  if (!sub.plan.allowRenewal) throw new Error("Renewal is not allowed for this plan");
  if (sub.status !== "ACTIVE" && sub.status !== "CLOSED") {
    throw new Error("Only active or closed subscriptions can be renewed");
  }

  const items = sub.items.map((item: any) => ({
    productId: item.productId,
    variantId: item.variantId,
    description: item.descriptionSnapshot,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    taxRateSnapshot: Number(item.taxRateSnapshot),
  }));

  return createSubscription({
    customerId: sub.customerId,
    planId: sub.planId,
    createdById: actorId,
    startDate: newStartDate,
    expiryDate: newExpiryDate,
    currency: sub.currency,
    items,
  });
}
