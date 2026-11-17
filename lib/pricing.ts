import { SHIPPING_FEE_MILLIMES } from "@/lib/money";

/**
 * Pure pricing math shared by the cart UI and the server. All amounts are integer millimes.
 * The server always recomputes with database prices; the client copy is display-only.
 */
export type PricedLine = { unitPrice: number; quantity: number };

export type Totals = {
  itemCount: number; // total quantity, the same number the header badge shows
  subtotal: number;
  shippingFee: number;
  total: number;
};

export function computeTotals(lines: readonly PricedLine[]): Totals {
  let itemCount = 0;
  let subtotal = 0;
  for (const { unitPrice, quantity } of lines) {
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) throw new RangeError(`Invalid unit price: ${unitPrice}`);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError(`Invalid quantity: ${quantity}`);
    itemCount += quantity;
    subtotal += unitPrice * quantity;
  }
  if (!Number.isSafeInteger(subtotal)) throw new RangeError("Subtotal overflow");
  // No shipping on an empty cart.
  const shippingFee = itemCount > 0 ? SHIPPING_FEE_MILLIMES : 0;
  return { itemCount, subtotal, shippingFee, total: subtotal + shippingFee };
}
