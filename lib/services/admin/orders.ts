import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CANCELLABLE, NEXT_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { AdminError } from "./errors";

export const ORDERS_PAGE_SIZE = 25;

export async function listOrders({ status, q, page }: { status?: OrderStatus; q?: string; page: number }) {
  const term = q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(term && {
      OR: [
        { shortCode: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term.replace(/\s/g, "") } },
      ],
    }),
  };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        shortCode: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        email: true,
        total: true,
        status: true,
        userId: true,
        _count: { select: { items: true } },
        items: { select: { quantity: true } },
      },
    }),
  ]);
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    rows: rows.map(({ items, ...r }) => ({ ...r, itemCount: items.reduce((n, i) => n + i.quantity, 0) })),
  };
}

export async function countOrdersByStatus() {
  const groups = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<OrderStatus, number>>;
  return counts;
}

export async function getAdminOrder(shortCode: string) {
  return prisma.order.findUnique({
    where: { shortCode },
    select: {
      id: true,
      shortCode: true,
      status: true,
      createdAt: true,
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      zip: true,
      country: true,
      subtotal: true,
      shippingFee: true,
      total: true,
      paymentMethod: true,
      items: {
        select: {
          id: true,
          productName: true,
          size: true,
          unitPrice: true,
          quantity: true,
          variant: { select: { stock: true, product: { select: { id: true } } } },
        },
        orderBy: { productName: "asc" },
      },
    },
  });
}

/** Compare-and-set on the current status, so two admins can't clobber each other. */
export async function updateOrderStatus(orderId: string, from: OrderStatus, to: OrderStatus) {
  if (!NEXT_STATUSES[from].includes(to)) {
    throw new AdminError(`An order can't go from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}.`);
  }
  const { count } = await prisma.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (count === 0) throw new AdminError("This order's status was changed by someone else. Reload to see the latest.");
}

/**
 * Cancels and restocks in one transaction. The status flip is conditional, so if two cancels
 * race, only one restocks. Items whose variant was since deleted can't be restocked; we report them.
 */
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: [...CANCELLABLE] } },
      data: { status: "CANCELLED" },
    });
    if (count === 0) {
      const o = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (!o) throw new AdminError("Order not found.");
      throw new AdminError(
        o.status === "CANCELLED" ? "This order is already cancelled." : `A ${STATUS_LABEL[o.status].toLowerCase()} order can't be cancelled.`,
      );
    }
    const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true, productName: true, size: true } });
    const notRestocked: string[] = [];
    let restockedUnits = 0;
    for (const item of items) {
      if (!item.variantId) {
        notRestocked.push(`${item.productName} (${item.size})`);
        continue;
      }
      const r = await tx.variant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      if (r.count === 0) notRestocked.push(`${item.productName} (${item.size})`);
      else restockedUnits += item.quantity;
    }
    return { restockedUnits, notRestocked };
  });
}
