import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import type { PlaceOrderData } from "@/lib/validation/checkout";

export type CheckoutErrorCode = "UNAVAILABLE" | "OUT_OF_STOCK" | "PRICE_CHANGED";

/** A business-rule failure the shopper can fix (refresh cart, confirm new total). */
export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

// No 0/O/1/I so codes survive being read out over the phone.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateShortCode(length = 4): string {
  let s = "";
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `FO-${s}`;
}

function isShortCodeCollision(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    JSON.stringify(e.meta?.target ?? "").includes("shortCode")
  );
}

/**
 * Creates an order in ONE transaction:
 *   1. load variants + current prices from the DB (client prices are ignored)
 *   2. recompute totals; stop if they differ from what the shopper saw
 *   3. decrement stock with a conditional UPDATE per line (stock >= qty), so two concurrent
 *      checkouts can never both take the last unit; any shortfall rolls everything back
 *   4. insert the order with price/name/size snapshots
 */
export async function createOrder(data: PlaceOrderData, userId: string | null) {
  // Lock rows in a stable order so two overlapping carts can't deadlock each other.
  const items = [...data.items].sort((a, b) => a.variantId.localeCompare(b.variantId));

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const variants = await tx.variant.findMany({
          where: { id: { in: items.map((i) => i.variantId) } },
          select: { id: true, size: true, product: { select: { name: true, price: true, isActive: true } } },
        });
        const byId = new Map(variants.map((v) => [v.id, v]));

        const lines = items.map((i) => {
          const v = byId.get(i.variantId);
          if (!v || !v.product.isActive) {
            throw new CheckoutError("UNAVAILABLE", "Some items in your cart are no longer available.");
          }
          return { ...i, size: v.size, productName: v.product.name, unitPrice: v.product.price };
        });

        const totals = computeTotals(lines);
        if (totals.total !== data.expectedTotal) {
          throw new CheckoutError("PRICE_CHANGED", "Prices changed since you added these items. Please review the new total.");
        }

        const short: string[] = [];
        for (const line of lines) {
          const { count } = await tx.variant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (count === 0) short.push(`${line.productName} (${line.size})`);
        }
        if (short.length > 0) {
          throw new CheckoutError("OUT_OF_STOCK", `Not enough stock for: ${short.join(", ")}.`);
        }

        return tx.order.create({
          data: {
            shortCode: generateShortCode(),
            userId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            street: data.street,
            city: data.city,
            zip: data.zip,
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            total: totals.total,
            paymentMethod: "COD",
            items: {
              create: lines.map((l) => ({
                variantId: l.variantId,
                productName: l.productName,
                size: l.size,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
              })),
            },
          },
          select: { id: true, shortCode: true },
        });
      });
    } catch (e) {
      if (isShortCodeCollision(e)) continue; // whole transaction rolled back; try a new code
      throw e;
    }
  }
  throw new Error("Could not allocate a unique order code");
}

/**
 * Just enough to decide who may see an order. Deliberately contains no personal data, so
 * nothing sensitive is loaded (or can leak via serialization) before access is checked.
 */
export async function getOrderAccessInfo(shortCode: string) {
  return prisma.order.findUnique({
    where: { shortCode },
    select: { id: true, shortCode: true, userId: true, status: true },
  });
}

/** Full order with personal details. Only call after an access check. */
export async function getOrderDetails(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shortCode: true,
      userId: true,
      status: true,
      createdAt: true,
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
        select: { id: true, productName: true, size: true, unitPrice: true, quantity: true },
        orderBy: { productName: "asc" },
      },
    },
  });
}
