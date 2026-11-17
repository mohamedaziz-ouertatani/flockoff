"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { rememberOrder } from "@/lib/order-access";
import { CheckoutError, createOrder, type CheckoutErrorCode } from "@/lib/services/orders";
import { placeOrderSchema, type CheckoutField } from "@/lib/validation/checkout";

export type PlaceOrderResult =
  | { ok: true; shortCode: string }
  | { ok: false; kind: "invalid"; fieldErrors: Partial<Record<CheckoutField, string[]>>; formError?: string }
  | { ok: false; kind: "cart"; code: CheckoutErrorCode; message: string }
  | { ok: false; kind: "server"; message: string };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const fieldErrors = flat.fieldErrors as Partial<Record<CheckoutField | "items" | "expectedTotal", string[]>>;
    const { items, expectedTotal, ...contact } = fieldErrors;
    return {
      ok: false,
      kind: "invalid",
      fieldErrors: contact,
      formError: items?.[0] ?? (expectedTotal ? "Please refresh your cart." : flat.formErrors[0]),
    };
  }

  const session = await auth();
  try {
    const order = await createOrder(parsed.data, session?.user?.id ?? null);
    await rememberOrder(order.id);
    return { ok: true, shortCode: order.shortCode };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, kind: "cart", code: e.code, message: e.message };
    console.error("placeOrder failed", e);
    return { ok: false, kind: "server", message: "Something went wrong placing your order. Please try again." };
  }
}
