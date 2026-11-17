import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { cancelOrder, updateOrderStatus } from "@/lib/services/admin/orders";
import { AdminError } from "@/lib/services/admin/errors";
import { updateProduct } from "@/lib/services/admin/products";
import { createOrder } from "@/lib/services/orders";
import { productInputSchema } from "@/lib/validation/admin";
import { makeProduct, orderInput, stockOf } from "./fixtures";

afterAll(() => prisma.$disconnect());

async function placeOne(variantId: string, quantity: number) {
  return createOrder(orderInput([{ variantId, quantity, unitPrice: 75_000 }]), null);
}

describe("cancelOrder", () => {
  it("restocks exactly once, even if three admins click Cancel at the same time", async () => {
    const { variant } = await makeProduct({ M: 10 });
    const v = variant("M");
    const order = await placeOne(v.id, 3);
    expect(await stockOf(v.id)).toBe(7);

    const results = await Promise.allSettled([cancelOrder(order.id), cancelOrder(order.id), cancelOrder(order.id)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf(v.id)).toBe(10);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
  });

  it("refuses to cancel a delivered order (would restock goods the customer has)", async () => {
    const { variant } = await makeProduct({ M: 5 });
    const order = await placeOne(variant("M").id, 1);
    await updateOrderStatus(order.id, "PENDING", "SHIPPED");
    await updateOrderStatus(order.id, "SHIPPED", "DELIVERED");

    await expect(cancelOrder(order.id)).rejects.toBeInstanceOf(AdminError);
    expect(await stockOf(variant("M").id)).toBe(4);
  });

  it("reports items it can't restock because the size was deleted", async () => {
    const { variant } = await makeProduct({ M: 5, L: 5 });
    const order = await createOrder(
      orderInput([
        { variantId: variant("M").id, quantity: 1, unitPrice: 75_000 },
        { variantId: variant("L").id, quantity: 2, unitPrice: 75_000 },
      ]),
      null,
    );
    await prisma.variant.delete({ where: { id: variant("L").id } });

    const result = await cancelOrder(order.id);
    expect(result.restockedUnits).toBe(1);
    expect(result.notRestocked).toEqual([expect.stringContaining("(L)")]);
  });
});

describe("updateOrderStatus", () => {
  it("only moves forward, and refuses a stale 'from' status", async () => {
    const { variant } = await makeProduct({ M: 5 });
    const order = await placeOne(variant("M").id, 1);

    await expect(updateOrderStatus(order.id, "PENDING", "DELIVERED")).rejects.toBeInstanceOf(AdminError);
    await updateOrderStatus(order.id, "PENDING", "CONFIRMED");
    await expect(updateOrderStatus(order.id, "PENDING", "CONFIRMED")).rejects.toThrow(/changed by someone else/);
    await expect(updateOrderStatus(order.id, "CONFIRMED", "CANCELLED")).rejects.toBeInstanceOf(AdminError);
  });
});

describe("updateProduct stock (compare-and-set)", () => {
  function input(categoryId: string, slug: string, variants: { size: "M" | "L"; stock: number; expectedStock: number | null }[]) {
    return productInputSchema.parse({
      name: "Edited",
      slug,
      price: "75",
      categoryId,
      collectionId: "",
      description: "Edited",
      isFeatured: false,
      isActive: true,
      variants,
    });
  }

  it("refuses to overwrite stock that changed since the admin loaded the form", async () => {
    const { product, category, variant } = await makeProduct({ M: 5 });
    await placeOne(variant("M").id, 1); // a sale: 5 -> 4 while the admin's form still says 5

    await expect(
      updateProduct(product.id, input(category.id, product.slug, [{ size: "M", stock: 50, expectedStock: 5 }])),
    ).rejects.toThrow(/changed while you were editing/);
    expect(await stockOf(variant("M").id)).toBe(4);
  });

  it("applies the edit when nothing changed underneath, adding and removing sizes", async () => {
    const { product, category } = await makeProduct({ M: 5 });

    await updateProduct(
      product.id,
      input(category.id, product.slug, [
        { size: "M", stock: 8, expectedStock: 5 },
        { size: "L", stock: 2, expectedStock: null },
      ]),
    );
    const sizes = await prisma.variant.findMany({ where: { productId: product.id }, orderBy: { size: "asc" }, select: { size: true, stock: true } });
    expect(sizes).toEqual([
      { size: "M", stock: 8 },
      { size: "L", stock: 2 },
    ]);
  });
});
