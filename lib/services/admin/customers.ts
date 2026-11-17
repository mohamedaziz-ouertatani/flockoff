import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Customers are derived from orders, grouped by email: most buyers check out as guests (COD),
 * so the User table alone would miss them. Each customer is addressed by an opaque key — the id
 * of their first order — so emails never appear in URLs or logs.
 */
export const CUSTOMERS_PAGE_SIZE = 25;

type Row = {
  email: string;
  key: string;
  first_name: string;
  last_name: string;
  phone: string;
  order_count: number;
  total_spent: bigint;
  last_order: Date;
  has_account: boolean;
  total_rows: bigint;
};

export async function listCustomers({ q, page }: { q: string; page: number }) {
  const term = q.trim();
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const search = term
    ? Prisma.sql`WHERE email ILIKE ${like} OR "firstName" ILIKE ${like} OR "lastName" ILIKE ${like} OR phone ILIKE ${like}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      email,
      (array_agg(id ORDER BY "createdAt" ASC))[1]           AS key,
      (array_agg("firstName" ORDER BY "createdAt" DESC))[1] AS first_name,
      (array_agg("lastName" ORDER BY "createdAt" DESC))[1]  AS last_name,
      (array_agg(phone ORDER BY "createdAt" DESC))[1]       AS phone,
      count(*)::int                                          AS order_count,
      coalesce(sum(total) FILTER (WHERE status <> 'CANCELLED'), 0)::bigint AS total_spent,
      max("createdAt")                                       AS last_order,
      bool_or("userId" IS NOT NULL)                          AS has_account,
      count(*) OVER ()                                       AS total_rows
    FROM "Order"
    ${search}
    GROUP BY email
    ORDER BY max("createdAt") DESC
    LIMIT ${CUSTOMERS_PAGE_SIZE} OFFSET ${(page - 1) * CUSTOMERS_PAGE_SIZE}
  `;
  const total = rows[0] ? Number(rows[0].total_rows) : 0;
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE)),
    customers: rows.map((r) => ({
      key: r.key,
      email: r.email,
      name: `${r.first_name} ${r.last_name}`,
      phone: r.phone,
      orderCount: r.order_count,
      totalSpent: Number(r.total_spent),
      lastOrder: r.last_order,
      hasAccount: r.has_account,
    })),
  };
}

export async function getCustomer(key: string) {
  const anchor = await prisma.order.findUnique({ where: { id: key }, select: { email: true } });
  if (!anchor) return null;
  const orders = await prisma.order.findMany({
    where: { email: anchor.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shortCode: true,
      createdAt: true,
      status: true,
      total: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      zip: true,
      user: { select: { createdAt: true } },
      items: { select: { quantity: true } },
    },
  });
  const latest = orders[0];
  const account = orders.find((o) => o.user)?.user ?? null;
  return {
    email: anchor.email,
    name: `${latest.firstName} ${latest.lastName}`,
    phone: latest.phone,
    address: { street: latest.street, city: latest.city, zip: latest.zip },
    accountSince: account?.createdAt ?? null,
    orderCount: orders.length,
    totalSpent: orders.filter((o) => o.status !== "CANCELLED").reduce((n, o) => n + o.total, 0),
    orders: orders.map((o) => ({
      id: o.id,
      shortCode: o.shortCode,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    })),
  };
}
