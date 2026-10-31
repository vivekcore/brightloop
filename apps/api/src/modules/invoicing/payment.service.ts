import { prisma, Decimal } from "@repo/db";

export async function recordPayment(data: {
  invoiceId: string;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";
  amount: number;
  paidAt?: Date;
  note?: string;
  createdById: string;
}) {
  const invoice = await (prisma as any).invoice.findUnique({
    where: { id: data.invoiceId },
    include: { payments: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled invoice");
  if (invoice.status === "DRAFT") throw new Error("Cannot record payment on a draft invoice; confirm it first");

  // Calculate existing paid amount
  let totalPaid = new Decimal(0);
  for (const p of invoice.payments) {
    totalPaid = totalPaid.add(new Decimal(p.amount));
  }

  const invoiceTotal = new Decimal(invoice.total);
  const remainingBalance = invoiceTotal.minus(totalPaid);
  const paymentAmount = new Decimal(data.amount);

  if (paymentAmount.gt(remainingBalance)) {
    throw new Error(`Payment amount (${paymentAmount.toString()}) exceeds remaining balance (${remainingBalance.toString()})`);
  }

  return prisma.$transaction(async (tx) => {
    const payment = await (tx as any).payment.create({
      data: {
        invoiceId: data.invoiceId,
        method: data.method,
        amount: paymentAmount,
        paidAt: data.paidAt ?? new Date(),
        note: data.note ?? null,
        createdById: data.createdById,
      },
      include: {
        createdBy: true,
      },
    });

    const newTotalPaid = totalPaid.add(paymentAmount);
    const newRemaining = invoiceTotal.minus(newTotalPaid);
    const newStatus = newRemaining.isZero() ? "PAID" : invoice.status;

    const updatedInvoice = await (tx as any).invoice.update({
      where: { id: data.invoiceId },
      data: {
        status: newStatus,
      },
      include: {
        customer: true,
        subscription: true,
        items: { include: { product: true } },
        payments: { include: { createdBy: true } },
      },
    });

    return { payment, invoice: updatedInvoice, remainingBalance: newRemaining };
  });
}

export async function getPayments(query: {
  page: number;
  limit: number;
  invoiceId?: string;
}) {
  const skip = (query.page - 1) * query.limit;
  const where: any = {};
  if (query.invoiceId) {
    where.invoiceId = query.invoiceId;
  }

  const [total, data] = await Promise.all([
    (prisma as any).payment.count({ where }),
    (prisma as any).payment.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: true,
        invoice: true,
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
