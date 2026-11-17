"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { clampQuantity, LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./quantity-stepper";

type Variant = { id: string; size: string; stock: number };

/**
 * Size selector + quantity + Add to Cart. Errors are shown inline next to the control they
 * belong to (no toasts). The cart itself arrives in Phase 3; `handleAdd` is where it plugs in.
 */
export function ProductPurchase({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const soldOut = variants.every((v) => v.stock <= 0);
  const max = selected?.stock ?? 1;

  function pickSize(v: Variant) {
    setVariantId(v.id);
    setSizeError(null);
    setNotice(null);
    // Switching to a size with less stock must not leave an impossible quantity behind.
    setQuantity((q) => clampQuantity(q, v.stock));
  }

  function handleAdd() {
    setNotice(null);
    if (!selected) {
      setSizeError("Please select a size.");
      return;
    }
    const qty = clampQuantity(quantity, selected.stock);
    if (qty !== quantity) setQuantity(qty);
    // TODO(phase 3): add { variantId: selected.id, quantity: qty } to the cart store.
    setNotice(`Size ${selected.size} × ${qty} selected. The cart arrives in the next build phase.`);
  }

  if (soldOut) {
    return (
      <div className="flex flex-col gap-3">
        <Button size="lg" disabled className="h-12 w-full">
          Sold out
        </Button>
        <p className="text-sm text-muted-foreground">Every size is gone for now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset aria-describedby={sizeError ? "size-error" : undefined}>
        <div className="mb-3 flex items-baseline justify-between">
          <legend className="text-[11px] font-semibold tracking-widest uppercase">
            Size{selected && <span className="ml-2 font-normal text-muted-foreground normal-case">{selected.size}</span>}
          </legend>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {variants.map((v) => {
            const out = v.stock <= 0;
            const isSel = v.id === variantId;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                disabled={out}
                onClick={() => pickSize(v)}
                aria-label={out ? `${v.size}, sold out` : v.size}
                className={cn(
                  "relative h-11 min-w-14 border px-3 text-sm font-medium transition-colors",
                  isSel ? "border-foreground bg-foreground text-background" : "hover:border-foreground",
                  out && "cursor-not-allowed text-muted-foreground line-through decoration-1 hover:border-border",
                  sizeError && !isSel && !out && "border-destructive",
                )}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        {sizeError && (
          <p id="size-error" role="alert" className="mt-2 text-sm text-destructive">
            {sizeError}
          </p>
        )}
        {selected && selected.stock <= LOW_STOCK_THRESHOLD && (
          <p className="mt-2 text-sm text-brand">Only {selected.stock} left in {selected.size}.</p>
        )}
      </fieldset>

      <div>
        <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase">Quantity</p>
        <QuantityStepper
          value={quantity}
          max={max}
          onChange={(q) => {
            setQuantity(q);
            setNotice(null);
          }}
          disabled={!selected}
          aria-describedby="qty-hint"
        />
        <p id="qty-hint" className="mt-2 text-xs text-muted-foreground">
          {selected ? `${selected.stock} available` : "Select a size first"}
        </p>
      </div>

      <Button size="lg" className="h-12 w-full text-sm tracking-widest uppercase" onClick={handleAdd}>
        Add to cart
      </Button>
      {notice && (
        <p role="status" className="-mt-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}
