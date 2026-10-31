import { prisma, Decimal } from "@repo/db";

export async function createProduct(data: {
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes?: string;
  isActive?: boolean;
}) {
  return (prisma as any).product.create({
    data: {
      name: data.name,
      type: data.type,
      salesPrice: new Decimal(data.salesPrice),
      costPrice: new Decimal(data.costPrice),
      notes: data.notes,
      isActive: data.isActive ?? true,
    },
    include: {
      variants: true,
      plans: true,
    },
  });
}

export async function getProducts(query: {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  isActive?: boolean;
  sortBy: "name" | "salesPrice" | "createdAt";
  sortOrder: "asc" | "desc";
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }
  if (query.type) {
    where.type = query.type;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const [total, data] = await Promise.all([
    (prisma as any).product.count({ where }),
    (prisma as any).product.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: {
        variants: true,
        plans: true,
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

export async function getProductById(id: string, includeCost = true) {
  const product = await (prisma as any).product.findUnique({
    where: { id },
    include: {
      variants: true,
      plans: true,
    },
  });

  if (!product) return null;

  if (!includeCost) {
    const { costPrice, ...rest } = product;
    return rest;
  }

  return product;
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    type?: string;
    salesPrice?: number;
    costPrice?: number;
    notes?: string;
    isActive?: boolean;
  }
) {
  const updateData: any = { ...data };
  if (data.salesPrice !== undefined) {
    updateData.salesPrice = new Decimal(data.salesPrice);
  }
  if (data.costPrice !== undefined) {
    updateData.costPrice = new Decimal(data.costPrice);
  }

  return (prisma as any).product.update({
    where: { id },
    data: updateData,
    include: {
      variants: true,
      plans: true,
    },
  });
}

export async function archiveProduct(id: string) {
  return (prisma as any).product.update({
    where: { id },
    data: { isActive: false },
  });
}

// Variant operations
export async function createVariant(
  productId: string,
  data: {
    attributeName: string;
    value: string;
    priceAdjustment?: number;
    isActive?: boolean;
  }
) {
  return (prisma as any).productVariant.create({
    data: {
      productId,
      attributeName: data.attributeName,
      value: data.value,
      priceAdjustment: new Decimal(data.priceAdjustment ?? 0),
      isActive: data.isActive ?? true,
    },
  });
}

export async function getVariants(productId: string) {
  return (prisma as any).productVariant.findMany({
    where: { productId },
  });
}

export async function updateVariant(
  variantId: string,
  productId: string,
  data: {
    attributeName?: string;
    value?: string;
    priceAdjustment?: number;
    isActive?: boolean;
  }
) {
  const variant = await (prisma as any).productVariant.findFirst({
    where: { id: variantId, productId },
  });

  if (!variant) {
    throw new Error("Variant not found or does not belong to this product");
  }

  const updateData: any = { ...data };
  if (data.priceAdjustment !== undefined) {
    updateData.priceAdjustment = new Decimal(data.priceAdjustment);
  }

  return (prisma as any).productVariant.update({
    where: { id: variantId },
    data: updateData,
  });
}

export async function deactivateVariant(variantId: string, productId: string) {
  const variant = await (prisma as any).productVariant.findFirst({
    where: { id: variantId, productId },
  });

  if (!variant) {
    throw new Error("Variant not found or does not belong to this product");
  }

  return (prisma as any).productVariant.update({
    where: { id: variantId },
    data: { isActive: false },
  });
}

// Plan operations
export async function createPlan(data: {
  productId: string;
  name: string;
  price: number;
  billingInterval: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  minimumQuantity?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  autoCloseAtEnd?: boolean;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenewal?: boolean;
  isActive?: boolean;
}) {
  return (prisma as any).plan.create({
    data: {
      productId: data.productId,
      name: data.name,
      price: new Decimal(data.price),
      billingInterval: data.billingInterval,
      minimumQuantity: data.minimumQuantity ?? 1,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil,
      autoCloseAtEnd: data.autoCloseAtEnd ?? false,
      allowEarlyClose: data.allowEarlyClose ?? false,
      allowPause: data.allowPause ?? false,
      allowRenewal: data.allowRenewal ?? false,
      isActive: data.isActive ?? true,
    },
    include: {
      product: true,
    },
  });
}

export async function getPlans(query: {
  page: number;
  limit: number;
  productId?: string;
  billingInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  isActive?: boolean;
  availableNow?: boolean;
  search?: string;
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};

  if (query.productId) {
    where.productId = query.productId;
  }
  if (query.billingInterval) {
    where.billingInterval = query.billingInterval;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { product: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  if (query.availableNow) {
    const now = new Date();
    where.AND = [
      { isActive: true },
      {
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: now } },
        ],
      },
      {
        OR: [
          { availableUntil: null },
          { availableUntil: { gte: now } },
        ],
      },
    ];
  }

  const [total, data] = await Promise.all([
    (prisma as any).plan.count({ where }),
    (prisma as any).plan.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
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

export async function getPlanById(id: string) {
  return (prisma as any).plan.findUnique({
    where: { id },
    include: {
      product: true,
    },
  });
}

export async function updatePlan(
  id: string,
  data: {
    name?: string;
    price?: number;
    billingInterval?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    minimumQuantity?: number;
    availableFrom?: Date;
    availableUntil?: Date;
    autoCloseAtEnd?: boolean;
    allowEarlyClose?: boolean;
    allowPause?: boolean;
    allowRenewal?: boolean;
    isActive?: boolean;
  }
) {
  const updateData: any = { ...data };
  if (data.price !== undefined) {
    updateData.price = new Decimal(data.price);
  }

  return (prisma as any).plan.update({
    where: { id },
    data: updateData,
    include: {
      product: true,
    },
  });
}

export async function archivePlan(id: string) {
  return (prisma as any).plan.update({
    where: { id },
    data: { isActive: false },
  });
}
