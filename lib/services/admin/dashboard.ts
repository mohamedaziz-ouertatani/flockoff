import "server-only";
import { prisma } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Revenue = orders that weren't cancelled (booked). With cash on delivery, money is only actually
 * in hand once DELIVERED, so that figure is reported separately as "collected".
 */
export async function getDashboard() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const notCancelled = { status: { not: "CANCELLED" as const } };

  const [allTime, last30, collected, byStatus, lowStock, latest] = await Promise.all([
    prisma.order.aggregate({ where: notCancelled, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { ...notCancelled, createdAt: { gte: since } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.variant.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      take: 20,
      select: { id: true, size: true, stock: true, product: { select: { id: true, name: true, isActive: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, shortCode: true, createdAt: true, firstName: true, lastName: true, total: true, status: true },
    }),
  ]);

  return {
    revenue: {
      allTime: allTime._sum.total ?? 0,
      allTimeOrders: allTime._count._all,
      last30: last30._sum.total ?? 0,
      last30Orders: last30._count._all,
      collected: collected._sum.total ?? 0,
    },
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])) as Record<string, number>,
    lowStock,
    latest,
  };
}
