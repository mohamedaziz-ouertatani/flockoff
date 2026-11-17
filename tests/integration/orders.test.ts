import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { CheckoutError, createOrder } from "@/lib/services/orders";
import { makeProduct, orderInput, stockOf } from "./fixtures";

afterAll(() => prisma.$disconnect());

describe("createOrder (checkout transaction)", () => {
  it("creates the order with server-side totals and snapshots, and decrements stock", async () => {
    const { product, variant } = await makeProduct({ M: 5 }, 75_000);
    const v = variant("M");

    const created = await createOrder(orderInput([{ variantId: v.id, quantity: 2, unitPrice: 75_000 }]), null);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true } });
    expect(order.shortCode).toMatch(/^FO-[2-9A-HJ-NP-Z]{4}$/);
    expect(order).toMatchObject({ subtotal: 150_000, shippingFee: 7_000, total: 157_000, status: "PENDING", paymentMethod: "COD" });
    expect(order.items).toEqual([
      expect.objectContaining({ variantId: v.id, productName: product.name, size: "M", unitPrice: 75_000, quantity: 2 }),
    ]);
    expect(await stockOf(v.id)).toBe(3);
  });

  it("never oversells: 8 concurrent checkouts for the last unit produce exactly 1 order", async () => {
    const { variant } = await makeProduct({ M: 1 });
    const v = variant("M");
    const input = orderInput([{ variantId: v.id, quantity: 1, unitPrice: 75_000 }]);

    const results = await Promise.allSettled(Array.from({ length: 8 }, () => createOrder(input, null)));

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejections = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejections).toHaveLength(7);
    for (const r of rejections) expect(r.reason).toMatchObject({ code: "OUT_OF_STOCK" });
    expect(await stockOf(v.id)).toBe(0);
  });

  it("refuses a total the client computed from stale or tampered prices", async () => {
    const { variant } = await makeProduct({ M: 5 }, 75_000);
    const v = variant("M");
    const tampered = { ...orderInput([{ variantId: v.id, quantity: 1, unitPrice: 75_000 }]), expectedTotal: 1_000 };

    await expect(createOrder(tampered, null)).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(await stockOf(v.id)).toBe(5);
  });

  it("rolls back every line when one line is short", async () => {
    const a = await makeProduct({ M: 5 });
    const b = await makeProduct({ L: 1 });
    const input = orderInput([
      { variantId: a.variant("M").id, quantity: 2, unitPrice: 75_000 },
      { variantId: b.variant("L").id, quantity: 3, unitPrice: 75_000 },
    ]);

    const err = await createOrder(input, null).catch((e) => e);
    expect(err).toBeInstanceOf(CheckoutError);
    expect(err.code).toBe("OUT_OF_STOCK");
    expect(await stockOf(a.variant("M").id)).toBe(5); // first line not left decremented
    expect(await stockOf(b.variant("L").id)).toBe(1);
  });

  it("refuses inactive products", async () => {
    const { product, variant } = await makeProduct({ M: 5 });
    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });

    await expect(
      createOrder(orderInput([{ variantId: variant("M").id, quantity: 1, unitPrice: 75_000 }]), null),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("the database itself refuses negative stock (last line of defence)", async () => {
    const { variant } = await makeProduct({ M: 1 });
    await expect(prisma.variant.update({ where: { id: variant("M").id }, data: { stock: -1 } })).rejects.toThrow(/Variant_stock_nonnegative/);
  });
});
