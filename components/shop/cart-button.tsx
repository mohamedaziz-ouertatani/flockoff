"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { selectItemCount, useCart } from "@/lib/cart/store";

export function CartButton() {
  const count = useCart(selectItemCount);
  const hydrated = useCart((s) => s.hydrated);
  const shown = hydrated ? count : 0;

  return (
    <Link
      href="/cart"
      className="relative grid size-9 place-items-center rounded-md hover:bg-accent"
      aria-label={shown > 0 ? `Cart, ${shown} ${shown === 1 ? "item" : "items"}` : "Cart"}
    >
      <ShoppingBagIcon className="size-5" />
      {shown > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] leading-none font-bold text-brand-foreground tabular-nums"
        >
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}
