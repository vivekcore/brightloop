import { prisma, Decimal } from "@repo/db";

// Quotation Template Operations
export async function createQuotationTemplate(data: {
  name: string;
  description?: string;
  planId: string;
  validityDays?: number;
  isActive?: boolean;
  items?: Array<{
    productId: string;
    variantId?: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    sortOrder?: number;
  }>;
}) {
  return (prisma as any).quotationTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      planId: data.planId,
      validityDays: data.validityDays ?? 30,
      isActive: data.isActive ?? true,
      items: data.items
        ? {
            create: data.items.map((item, index) => ({
              productId: item.productId,
              variantId: item.variantId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice !== undefined ? new Decimal(item.unitPrice) : null,
              sortOrder: item.sortOrder ?? index,
            })),
          }
        : undefined,
    },
    include: {
      plan: { include: { product: true } },
      items: { include: { product: true } },
    },
  });
}

export async function getQuotationTemplates(query: {
  page: number;
  limit: number;
  search?: string;
  planId?: string;
  isActive?: boolean;
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }
  if (query.planId) {
    where.planId = query.planId;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  const [total, data] = await Promise.all([
    (prisma as any).quotationTemplate.count({ where }),
    (prisma as any).quotationTemplate.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        plan: { include: { product: true } },
        items: { include: { product: true } },
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

export async function getQuotationTemplateById(id: string) {
  return (prisma as any).quotationTemplate.findUnique({
    where: { id },
    include: {
      plan: { include: { product: true } },
      items: { include: { product: true } },
    },
  });
}

export async function updateQuotationTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    planId?: string;
    validityDays?: number;
    isActive?: boolean;
    items?: Array<{
      productId: string;
      variantId?: string;
      description?: string;
      quantity: number;
      unitPrice?: number;
      sortOrder?: number;
    }>;
  }
) {
  // If items are provided, replace them atomically
  return prisma.$transaction(async (tx) => {
    if (data.items !== undefined) {
      await (tx as any).quotationTemplateItem.deleteMany({
        where: { templateId: id },
      });
    }

    const updateData: any = { ...data };
    if (data.items !== undefined) {
      updateData.items = {
        create: data.items.map((item, index) => ({
          productId: item.productId,
          variantId: item.variantId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice !== undefined ? new Decimal(item.unitPrice) : null,
          sortOrder: item.sortOrder ?? index,
        })),
      };
    }

    return (tx as any).quotationTemplate.update({
      where: { id },
      data: updateData,
      include: {
        plan: { include: { product: true } },
        items: { include: { product: true } },
      },
    });
  });
}

export async function archiveQuotationTemplate(id: string) {
  return (prisma as any).quotationTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}
