import { prisma, Decimal } from "@repo/db";

export async function createDiscount(data: {
  name: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  minimumQuantity?: number;
  minimumPurchase?: number;
  startsAt: Date;
  endsAt: Date;
  usageLimit?: number;
}) {
  return (prisma as any).discount.create({
    data: {
      name: data.name,
      type: data.type,
      value: new Decimal(data.value),
      minimumQuantity: data.minimumQuantity ?? null,
      minimumPurchase: data.minimumPurchase ? new Decimal(data.minimumPurchase) : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      usageLimit: data.usageLimit ?? null,
      isActive: true,
    },
  });
}

export async function updateDiscount(id: string, data: {
  name?: string;
  type?: "FIXED" | "PERCENTAGE";
  value?: number;
  minimumQuantity?: number;
  minimumPurchase?: number;
  startsAt?: Date;
  endsAt?: Date;
  usageLimit?: number;
  isActive?: boolean;
}) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = new Decimal(data.value);
  if (data.minimumQuantity !== undefined) updateData.minimumQuantity = data.minimumQuantity;
  if (data.minimumPurchase !== undefined) updateData.minimumPurchase = data.minimumPurchase ? new Decimal(data.minimumPurchase) : null;
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;
  if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return (prisma as any).discount.update({
    where: { id },
    data: updateData,
  });
}

export async function getDiscounts(query: {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};
  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const [total, data] = await Promise.all([
    (prisma as any).discount.count({ where }),
    (prisma as any).discount.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
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

export async function getDiscountById(id: string) {
  return (prisma as any).discount.findUnique({
    where: { id },
  });
}

export async function applyDiscountToInvoice(invoiceId: string, discountId: string) {
  const invoice = await (prisma as any).invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT" && invoice.status !== "CONFIRMED") {
    throw new Error("Cannot apply discount to an invoice that is already paid or cancelled");
  }

  const discount = await (prisma as any).discount.findUnique({
    where: { id: discountId },
  });
  if (!discount || !discount.isActive) {
    throw new Error("Discount not found or inactive");
  }

  const now = new Date();
  if (now < new Date(discount.startsAt) || now > new Date(discount.endsAt)) {
    throw new Error("Discount has expired or is not yet active");
  }

  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
    throw new Error("Discount usage limit has been reached");
  }

  // Calculate total quantity and subtotal
  let totalQty = 0;
  let subtotal = new Decimal(0);
  for (const item of invoice.items) {
    totalQty += item.quantity;
    subtotal = subtotal.add(new Decimal(item.lineSubtotal));
  }

  if (discount.minimumQuantity !== null && totalQty < discount.minimumQuantity) {
    throw new Error(`Minimum quantity of ${discount.minimumQuantity} required for this discount`);
  }

  if (discount.minimumPurchase !== null && subtotal.lt(new Decimal(discount.minimumPurchase))) {
    throw new Error(`Minimum purchase amount of ${discount.minimumPurchase} required for this discount`);
  }

  // Calculate discount amount
  let discountAmount = new Decimal(0);
  if (discount.type === "FIXED") {
    discountAmount = new Decimal(discount.value);
    if (discountAmount.gt(subtotal)) {
      discountAmount = subtotal; // Cannot discount more than subtotal
    }
  } else {
    // PERCENTAGE
    discountAmount = subtotal.mul(new Decimal(discount.value)).div(100);
  }

  // Recalculate invoice totals:
  // Order: Subtotal -> Discount -> Tax on (Subtotal - Discount) -> Total
  // Wait, let's check tax calculation. Let's compute tax rate per item or average tax rate.
  // In our invoice items, each item has taxRate and taxAmount.
  // If discount is applied, taxable subtotal is subtotal - discountAmount.
  // Let's proportionally adjust tax or re-calculate tax on discounted amounts.
  const discountedSubtotal = subtotal.minus(discountAmount);

  let taxTotal = new Decimal(0);
  const updatedItems = invoice.items.map((item: any) => {
    const lineSub = new Decimal(item.lineSubtotal);
    // Proportion of subtotal
    const proportion = subtotal.isZero() ? new Decimal(0) : lineSub.div(subtotal);
    const lineDiscount = discountAmount.mul(proportion);
    const lineDiscountedSub = lineSub.minus(lineDiscount);
    const taxRate = new Decimal(item.taxRate);
    const taxAmount = lineDiscountedSub.mul(taxRate).div(100);
    const lineTotal = lineDiscountedSub.add(taxAmount);

    taxTotal = taxTotal.add(taxAmount);

    return {
      where: { id: item.id },
      data: {
        taxAmount,
        lineTotal,
      },
    };
  });

  const total = discountedSubtotal.add(taxTotal);

  return prisma.$transaction(async (tx) => {
    // Increment usedCount on discount
    await (tx as any).discount.update({
      where: { id: discount.id },
      data: { usedCount: { increment: 1 } },
    });

    // Update invoice items and invoice
    for (const ui of updatedItems) {
      await (tx as any).invoiceItem.update({
        where: ui.where,
        data: ui.data,
      });
    }

    return (tx as any).invoice.update({
      where: { id: invoiceId },
      data: {
        discountId: discount.id,
        discountAmount,
        taxTotal,
        total,
      },
      include: {
        customer: true,
        subscription: true,
        items: { include: { product: true } },
        discount: true,
      },
    });
  });
}
