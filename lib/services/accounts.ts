import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth";
import type { SignupData } from "@/lib/validation/auth";

export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailTakenError";
  }
}

/**
 * Creates a CUSTOMER account. The role is never taken from input.
 *
 * Past guest orders with the same email are deliberately NOT attached: emails aren't verified,
 * so anyone could sign up with someone else's address and read their orders (name, phone,
 * address). Order history covers orders placed while logged in.
 */
export async function registerCustomer(data: SignupData) {
  const passwordHash = await hashPassword(data.password);
  try {
    return await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "CUSTOMER",
      },
      select: { id: true, email: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new EmailTakenError();
    throw e;
  }
}

export async function getAccount(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, phone: true, createdAt: true, role: true },
  });
}

/** Only orders linked to this account (placed while logged in), newest first. */
export async function listAccountOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      shortCode: true,
      createdAt: true,
      status: true,
      total: true,
      items: { select: { productName: true, size: true, quantity: true }, orderBy: { productName: "asc" } },
    },
  });
  return orders.map((o) => ({
    ...o,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  }));
}
