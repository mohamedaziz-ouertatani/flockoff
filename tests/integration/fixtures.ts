import { randomBytes } from "node:crypto";
import type { Size } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import type { PlaceOrderData } from "@/lib/validation/checkout";

const uid = () => randomBytes(4).toString("hex");

/** A product with the given stock per size, in its own category. */
export async function makeProduct(stock: Partial<Record<Size, number>>, price = 75_000) {
  const id = uid();
  const category = await prisma.category.create({ data: { name: `Cat ${id}`, slug: `cat-${id}` } });
  const product = await prisma.product.create({
    data: {
      name: `Test Tee ${id}`,
      slug: `test-tee-${id}`,
      description: "Fixture",
      price,
      categoryId: category.id,
      variants: { create: Object.entries(stock).map(([size, s]) => ({ size: size as Size, stock: s! })) },
    },
    include: { variants: true },
  });
  const variant = (size: Size) => product.variants.find((v) => v.size === size)!;
  return { product, category, variant };
}

export const contact = {
  firstName: "Test",
  lastName: "Buyer",
  email: "buyer@test.local",
  phone: "+21622123456",
  city: "Tunis",
  street: "1 Rue de Test",
  zip: "1000",
};

/** Builds a valid placeOrder payload whose expectedTotal matches the given prices. */
export function orderInput(lines: { variantId: string; quantity: number; unitPrice: number }[]): PlaceOrderData {
  return {
    ...contact,
    items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    expectedTotal: computeTotals(lines).total,
  };
}

export async function stockOf(variantId: string) {
  return (await prisma.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;
}
