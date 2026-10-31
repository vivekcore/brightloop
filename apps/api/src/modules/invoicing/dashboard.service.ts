import { prisma, Decimal } from "@repo/db";

export async function getDashboardMetrics() {
  const [activeSubscriptionsCount, paymentsAggregate, invoices, overdueCount] = await Promise.all([
    (prisma as any).subscription.count({
      where: { status: "ACTIVE", isPaused: false },
    }),
    (prisma as any).payment.aggregate({
      _sum: { amount: true },
    }),
    (prisma as any).invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { payments: true },
    }),
    (prisma as any).invoice.count({
      where: {
        status: { in: ["CONFIRMED", "DRAFT"] },
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  const revenueReceived = paymentsAggregate._sum.amount ? Number(paymentsAggregate._sum.amount) : 0;

  let outstandingAmount = new Decimal(0);
  for (const inv of invoices) {
    const invTotal = new Decimal(inv.total);
    let paid = new Decimal(0);
    if (inv.payments) {
      for (const p of inv.payments) {
        paid = paid.add(new Decimal(p.amount));
      }
    }
    const balance = invTotal.minus(paid);
    if (balance.gt(0)) {
      outstandingAmount = outstandingAmount.add(balance);
    }
  }

  const recentInvoices = await (prisma as any).invoice.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      subscription: true,
      payments: true,
    },
  });

  const formattedInvoices = recentInvoices.map((inv: any) => {
    let paid = new Decimal(0);
    if (inv.payments) {
      for (const p of inv.payments) {
        paid = paid.add(new Decimal(p.amount));
      }
    }
    const total = new Decimal(inv.total);
    const outstanding = total.minus(paid);

    return {
      ...inv,
      paidAmount: paid.toString(),
      outstandingAmount: outstanding.toString(),
      subtotal: Number(inv.subtotal).toFixed(2),
      taxTotal: Number(inv.taxTotal).toFixed(2),
      total: Number(inv.total).toFixed(2),
    };
  });

  return {
    metrics: {
      activeSubscriptions: activeSubscriptionsCount,
      revenueReceived: revenueReceived.toFixed(2),
      outstandingAmount: outstandingAmount.toString(),
      overdueInvoices: overdueCount,
    },
    recentInvoices: formattedInvoices,
  };
}
