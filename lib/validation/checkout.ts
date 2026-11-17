import { z } from "zod";
import { normalizeTunisianPhone } from "@/lib/phone";

export const MAX_CART_LINES = 30;
export const MAX_LINE_QUANTITY = 99;

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(60, `${label} is too long`);

export const cartLineSchema = z.object({
  variantId: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

/** Shared by the checkout form (client) and the placeOrder action (server). */
export const checkoutContactSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")).pipe(z.string().max(254)),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeTunisianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a Tunisian number, e.g. +216 22 123 456" });
        return z.NEVER;
      }
      return n;
    }),
  city: z.string().trim().min(1, "City is required").max(80),
  street: z.string().trim().min(3, "Street address is required").max(200),
  zip: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Tunisian postal codes have 4 digits"),
});

export const placeOrderSchema = checkoutContactSchema.extend({
  items: z
    .array(cartLineSchema)
    .min(1, "Your cart is empty")
    .max(MAX_CART_LINES)
    // The same variant twice would bypass per-line stock checks.
    .refine((items) => new Set(items.map((i) => i.variantId)).size === items.length, "Duplicate cart lines"),
  /** What the shopper saw. If the server total differs, we stop and show the new total. */
  expectedTotal: z.number().int().min(0),
});

export type CheckoutContactInput = z.input<typeof checkoutContactSchema>;
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type PlaceOrderData = z.output<typeof placeOrderSchema>;
export type CheckoutField = keyof z.output<typeof checkoutContactSchema>;
