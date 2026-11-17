"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampQuantity } from "@/lib/stock";
import { MAX_CART_LINES } from "@/lib/validation/checkout";

/**
 * A cart line as remembered in the browser. Price/stock here are a *display cache*: they are
 * refreshed from the server (see reconcile) and the server re-validates everything at checkout.
 */
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  unitPrice: number; // millimes
  imageUrl: string | null;
  quantity: number;
  maxStock: number;
};

/** Fresh data for one variant from the server. `null` stock means it no longer exists/is inactive. */
export type VariantSnapshot = Omit<CartLine, "quantity" | "maxStock"> & { stock: number; active: boolean };

export type AddResult =
  | { ok: true; quantityInCart: number; clamped: boolean }
  | { ok: false; reason: "out-of-stock" | "cart-full"; quantityInCart: number };

type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity: number) => AddResult;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Applies server snapshots; returns human-readable notes about anything that changed. */
  reconcile: (snapshots: VariantSnapshot[]) => string[];
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,

      add(line, quantity) {
        const lines = get().lines;
        const existing = lines.find((l) => l.variantId === line.variantId);
        const inCart = existing?.quantity ?? 0;
        if (line.maxStock <= 0 || inCart >= line.maxStock) {
          return { ok: false, reason: "out-of-stock", quantityInCart: inCart };
        }
        if (!existing && lines.length >= MAX_CART_LINES) {
          return { ok: false, reason: "cart-full", quantityInCart: 0 };
        }
        const next = clampQuantity(inCart + quantity, line.maxStock);
        const updated: CartLine = { ...line, quantity: next };
        set({
          lines: existing
            ? lines.map((l) => (l.variantId === line.variantId ? updated : l))
            : [...lines, updated],
        });
        return { ok: true, quantityInCart: next, clamped: next < inCart + quantity };
      },

      setQuantity(variantId, quantity) {
        set({
          lines: get().lines.map((l) =>
            l.variantId === variantId ? { ...l, quantity: clampQuantity(quantity, l.maxStock) || 1 } : l,
          ),
        });
      },

      remove(variantId) {
        set({ lines: get().lines.filter((l) => l.variantId !== variantId) });
      },

      clear() {
        set({ lines: [] });
      },

      reconcile(snapshots) {
        const byId = new Map(snapshots.map((s) => [s.variantId, s]));
        const notes: string[] = [];
        const next: CartLine[] = [];
        for (const line of get().lines) {
          const s = byId.get(line.variantId);
          const label = `${line.name} (${line.size})`;
          if (!s || !s.active) {
            notes.push(`${label} is no longer available and was removed.`);
            continue;
          }
          if (s.stock <= 0) {
            notes.push(`${label} just sold out and was removed.`);
            continue;
          }
          const quantity = clampQuantity(line.quantity, s.stock);
          if (quantity < line.quantity) {
            notes.push(`Only ${s.stock} left of ${label}; quantity reduced to ${quantity}.`);
          }
          if (s.unitPrice !== line.unitPrice) {
            notes.push(`The price of ${label} changed.`);
          }
          next.push({
            ...line,
            productId: s.productId,
            slug: s.slug,
            name: s.name,
            size: s.size,
            unitPrice: s.unitPrice,
            imageUrl: s.imageUrl,
            quantity,
            maxStock: s.stock,
          });
        }
        set({ lines: next });
        return notes;
      },
    }),
    {
      name: "flockoff-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Rehydrated manually after mount (CartHydrator) so SSR and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => () => useCart.setState({ hydrated: true }),
    },
  ),
);

/** Total quantity: the single source for the header badge, cart page and checkout. */
export const selectItemCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
