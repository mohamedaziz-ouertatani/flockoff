import { formatTND } from "@/lib/money";
import type { Totals } from "@/lib/pricing";

/** Subtotal + flat shipping = total. Used by cart, checkout and order confirmation. */
export function OrderTotals({ totals, className }: { totals: Totals; className?: string }) {
  return (
    <dl className={className}>
      <div className="flex justify-between py-1.5 text-sm">
        <dt className="text-muted-foreground">
          Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
        </dt>
        <dd className="tabular-nums">{formatTND(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between py-1.5 text-sm">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="tabular-nums">{formatTND(totals.shippingFee)}</dd>
      </div>
      <div className="mt-2 flex justify-between border-t pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatTND(totals.total)}</dd>
      </div>
    </dl>
  );
}
