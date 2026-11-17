"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { CartNotes } from "@/components/shop/cart-notes";
import { OrderTotals } from "@/components/shop/order-summary";
import { ProductImage } from "@/components/shop/product-image";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart/store";
import { useCartSync } from "@/lib/cart/use-cart-sync";
import { formatTND } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";

export function CartView() {
  const { hydrated, notes, setNotes } = useCartSync();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <CartNotes notes={notes} />
        <div className="flex flex-col items-start gap-4 border border-dashed p-10">
          <p className="font-display text-3xl tracking-wide uppercase">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Nothing here yet. Find something you like.</p>
          <Button asChild>
            <Link href="/shop">Shop all</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totals = computeTotals(lines);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <CartNotes notes={notes} onDismiss={() => setNotes([])} />
        <ul className="divide-y border-y">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 py-5">
              <Link href={`/product/${l.slug}`} className="relative aspect-[5/6] w-24 shrink-0 overflow-hidden bg-muted">
                <ProductImage src={l.imageUrl} alt={l.name} fill sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/product/${l.slug}`} className="font-medium leading-snug hover:underline hover:underline-offset-4">
                    {l.name}
                  </Link>
                  <span className="shrink-0 tabular-nums">{formatTND(l.unitPrice * l.quantity)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Size {l.size} · {formatTND(l.unitPrice)} each
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-3">
                    <QuantityStepper
                      value={l.quantity}
                      max={l.maxStock}
                      onChange={(q) => setQuantity(l.variantId, q)}
                      label={`Quantity of ${l.name}, size ${l.size}`}
                    />
                    {l.quantity >= l.maxStock && (
                      <span className="text-xs text-muted-foreground">Max available</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.variantId)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${l.name}, size ${l.size}`}
                  >
                    <Trash2Icon className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div>
          {confirmClear ? (
            <div className="flex items-center gap-3 text-sm">
              <span>Remove everything from your cart?</span>
              <Button size="sm" variant="destructive" onClick={() => { clear(); setConfirmClear(false); }}>
                Yes, clear cart
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Clear cart
            </button>
          )}
        </div>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="border bg-card p-6">
          <h2 className="mb-4 text-[11px] font-semibold tracking-widest uppercase">Order summary</h2>
          <OrderTotals totals={totals} />
          <Button asChild size="lg" className="mt-6 h-12 w-full text-sm tracking-widest uppercase">
            <Link href="/checkout">Checkout</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Cash on delivery · Flat 7 TND shipping</p>
        </div>
      </aside>
    </div>
  );
}
