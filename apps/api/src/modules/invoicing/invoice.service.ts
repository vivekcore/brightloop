import { prisma, Decimal } from "@repo/db";

// Helper to generate unique invoice numbers: INV-YYYYMMDD-XXXX
export async function generateInvoiceNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `INV-${dateStr}-`;

  const latest = await (prisma as any).invoice.findFirst({
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

export async function generateInvoice(data: {
  subscriptionId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  taxRate?: number;
}) {
  const sub = await (prisma as any).subscription.findUnique({
    where: { id: data.subscriptionId },
    include: {
      customer: true,
      plan: true,
      items: { include: { product: true } },
    },
  });

  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "ACTIVE") throw new Error("Invoices can only be generated for ACTIVE subscriptions");
  if (sub.isPaused) throw new Error("Cannot generate invoices for paused subscriptions");

  // Check duplicate invoice for this subscription and billing period start
  const existing = await (prisma as any).invoice.findUnique({
    where: {
      subscriptionId_billingPeriodStart: {
        subscriptionId: data.subscriptionId,
        billingPeriodStart: data.billingPeriodStart,
      },
    },
  });

  if (existing) {
    return { invoice: existing, isExisting: true };
  }

  const invoiceNumber = await generateInvoiceNumber();
  const taxRateVal = new Decimal(data.taxRate ?? 0);

  let subtotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  const invoiceItems = sub.items.map((item: any, index: number) => {
    const qty = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    const lineSubtotal = qty.mul(unitPrice);
    const taxAmount = lineSubtotal.mul(taxRateVal).div(100);
    const lineTotal = lineSubtotal.add(taxAmount);

    subtotal = subtotal.add(lineSubtotal);
    taxTotal = taxTotal.add(taxAmount);

    return {
      subscriptionItemId: item.id,
      productId: item.productId,
      descriptionSnapshot: item.descriptionSnapshot,
      quantity: item.quantity,
      unitPrice,
      taxRate: taxRateVal,
      taxAmount,
      lineSubtotal,
      lineTotal,
      sortOrder: index,
    };
  });

  const total = subtotal.add(taxTotal);

  const invoice = await prisma.$transaction(async (tx) => {
    return (tx as any).invoice.create({
      data: {
        number: invoiceNumber,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        status: "CONFIRMED", // Auto-confirm on generation for MVP workflow
        billingPeriodStart: data.billingPeriodStart,
        billingPeriodEnd: data.billingPeriodEnd,
        dueDate: data.dueDate,
        subtotal,
        taxTotal,
        total,
        currency: sub.currency,
        items: {
          create: invoiceItems,
        },
      },
      include: {
        customer: true,
        subscription: true,
        items: { include: { product: true } },
      },
    });
  });

  return { invoice, isExisting: false };
}

export async function getInvoices(query: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  customerId?: string;
  subscriptionId?: string;
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
  if (query.customerId) {
    where.customerId = query.customerId;
  }
  if (query.subscriptionId) {
    where.subscriptionId = query.subscriptionId;
  }

  const [total, data] = await Promise.all([
    (prisma as any).invoice.count({ where }),
    (prisma as any).invoice.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        subscription: true,
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

export async function getInvoiceById(id: string, customerId?: string) {
  const where: any = { id };
  if (customerId) {
    where.customerId = customerId;
  }

  return (prisma as any).invoice.findFirst({
    where,
    include: {
      customer: true,
      subscription: true,
      items: { include: { product: true } },
    },
  });
}
