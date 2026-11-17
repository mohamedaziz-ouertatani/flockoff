import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { deviceTokenFor, hashPassword } from "@/lib/services/auth";
import { hit, LIMITS, refund } from "@/lib/services/rate-limit";
import type { ChangePasswordInput, SignupData } from "@/lib/validation/auth";

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

export type ChangePasswordResult =
  | { status: "ok"; /** New trusted-device token for the browser that made the change. */ deviceToken: string | null }
  | { status: "wrong_password" }
  | { status: "rate_limited"; retryAfterMs: number }
  /** The password changed in between (another tab or device): nothing was written. */
  | { status: "conflict" }
  | { status: "not_found" };

/**
 * Changes a logged-in user's password after checking the current one.
 *
 * - Wrong current passwords are limited per account, so a hijacked session can't be used to
 *   brute-force the password. A correct one refunds the attempt.
 * - The write is compare-and-set on the hash we verified against, so two concurrent changes
 *   can't silently overwrite each other.
 * - The new hash revokes every trusted-device token issued for the old password; the caller
 *   stores the returned token so this browser stays trusted.
 *
 * Not done (JWT sessions): sessions already open on other devices stay valid until they expire.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const limit = await hit(LIMITS.passwordChangePerUser, userId);
  if (!limit.allowed) return { status: "rate_limited", retryAfterMs: limit.retryAfterMs };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  if (!user) return { status: "not_found" };
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) return { status: "wrong_password" };

  const passwordHash = await hashPassword(input.newPassword);
  const { count } = await prisma.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash } });
  await refund(LIMITS.passwordChangePerUser, userId);
  if (count === 0) return { status: "conflict" };
  return { status: "ok", deviceToken: deviceTokenFor({ id: userId, passwordHash }) };
}
