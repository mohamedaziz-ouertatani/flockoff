"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart/store";
import { clampQuantity, LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./quantity-stepper";

type Variant = { id: string; size: string; stock: number };
type ProductMeta = { id: string; slug: string; name: string; price: number; imageUrl: string | null };

type Status = { kind: "added"; text: string } | { kind: "error"; text: string } | null;

/**
 * Size selector + quantity + Add to Cart. Errors are inline next to the control they belong to.
 * The selectable quantity accounts for what's already in the cart, so cart + new never exceeds stock.
 */
export function ProductPurchase({ product, variants }: { product: ProductMeta; variants: Variant[] }) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const add = useCart((s) => s.add);
  const hydrated = useCart((s) => s.hydrated);
  const lines = useCart((s) => s.lines);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const soldOut = variants.every((v) => v.stock <= 0);
  const inCart = (id: string) => (hydrated ? (lines.find((l) => l.variantId === id)?.quantity ?? 0) : 0);
  const remaining = selected ? Math.max(0, selected.stock - inCart(selected.id)) : 0;

  function pickSize(v: Variant) {
    setVariantId(v.id);
    setSizeError(null);
    setStatus(null);
    // Switching to a size with less room must not leave an impossible quantity behind.
    setQuantity((q) => clampQuantity(q, Math.max(1, v.stock - inCart(v.id))));
  }

  function handleAdd() {
    setStatus(null);
    if (!selected) {
      setSizeError("Please select a size.");
      return;
    }
    if (remaining <= 0) {
      setStatus({ kind: "error", text: `All ${selected.stock} available in ${selected.size} are already in your cart.` });
      return;
    }
    const result = add(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: selected.size,
        unitPrice: product.price,
        imageUrl: product.imageUrl,
        maxStock: selected.stock,
      },
      clampQuantity(quantity, remaining),
    );
    if (!result.ok) {
      setStatus({
        kind: "error",
        text: result.reason === "cart-full" ? "Your cart is full. Check out or remove something first." : "This size is out of stock.",
      });
      return;
    }
    setQuantity(1);
    setStatus({
      kind: "added",
      text: result.clamped
        ? `Added. You now have the maximum available (${result.quantityInCart}) in your cart.`
        : `Added to cart. You have ${result.quantityInCart} in size ${selected.size}.`,
    });
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
        <legend className="mb-3 text-[11px] font-semibold tracking-widest uppercase">
          Size{selected && <span className="ml-2 font-normal text-muted-foreground normal-case">{selected.size}</span>}
        </legend>
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
          max={Math.max(1, remaining)}
          onChange={(q) => {
            setQuantity(q);
            setStatus(null);
          }}
          disabled={!selected || remaining <= 0}
          aria-describedby="qty-hint"
        />
        <p id="qty-hint" className="mt-2 text-xs text-muted-foreground">
          {!selected
            ? "Select a size first"
            : inCart(selected.id) > 0
              ? `${remaining} more available (${inCart(selected.id)} already in your cart)`
              : `${selected.stock} available`}
        </p>
      </div>

      <Button size="lg" className="h-12 w-full text-sm tracking-widest uppercase" onClick={handleAdd}>
        Add to cart
      </Button>
      {status && (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={cn(
            "-mt-3 flex items-center gap-2 text-sm",
            status.kind === "error" ? "text-destructive" : "text-foreground",
          )}
        >
          {status.kind === "added" && <CheckIcon className="size-4 shrink-0" />}
          <span>
            {status.text}{" "}
            {status.kind === "added" && (
              <Link href="/cart" className="font-medium underline underline-offset-4">
                View cart
              </Link>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
