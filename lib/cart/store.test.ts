import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeTotals } from "@/lib/pricing";
import { selectItemCount, useCart, type CartLine } from "./store";

// Minimal in-memory localStorage. Hoisted above the imports: zustand's createJSONStorage grabs
// localStorage once when the store module loads, exactly as it does in the browser.
vi.hoisted(() => {
  const memory = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  } as Storage;
});

const line = (over: Partial<CartLine> = {}): Omit<CartLine, "quantity"> => ({
  variantId: "v-m",
  productId: "p1",
  slug: "tee",
  name: "Migration Tee",
  size: "M",
  unitPrice: 75_000,
  imageUrl: null,
  maxStock: 20,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ lines: [], hydrated: true });
});

describe("cart store", () => {
  it("adding past stock clamps to stock (old bug: 25 added when 20 in stock)", () => {
    const { add } = useCart.getState();
    add(line(), 15);
    const r = add(line(), 10);
    expect(r).toEqual({ ok: true, quantityInCart: 20, clamped: true });
    expect(useCart.getState().lines[0].quantity).toBe(20);
    expect(add(line(), 1)).toMatchObject({ ok: false, reason: "out-of-stock" });
  });

  it("setQuantity clamps to [1, stock]", () => {
    const s = useCart.getState();
    s.add(line(), 2);
    s.setQuantity("v-m", 99);
    expect(useCart.getState().lines[0].quantity).toBe(20);
    s.setQuantity("v-m", 0);
    expect(useCart.getState().lines[0].quantity).toBe(1);
  });

  it("badge count equals the checkout item count", () => {
    const s = useCart.getState();
    s.add(line(), 2);
    s.add(line({ variantId: "v-l", size: "L" }), 3);
    const state = useCart.getState();
    expect(selectItemCount(state)).toBe(5);
    expect(selectItemCount(state)).toBe(computeTotals(state.lines).itemCount);
  });

  it("reconcile applies fresh server data and explains changes", () => {
    const s = useCart.getState();
    s.add(line(), 5);
    s.add(line({ variantId: "v-l", size: "L" }), 1);
    s.add(line({ variantId: "v-xl", size: "XL" }), 1);
    const notes = useCart.getState().reconcile([
      { ...line(), unitPrice: 80_000, stock: 3, active: true }, // price up, stock down
      { ...line({ variantId: "v-l", size: "L" }), stock: 0, active: true }, // sold out
      // v-xl missing entirely -> removed
    ]);
    const lines = useCart.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ variantId: "v-m", quantity: 3, maxStock: 3, unitPrice: 80_000 });
    expect(lines[0]).not.toHaveProperty("stock"); // server-only fields aren't persisted
    expect(notes).toHaveLength(4);
  });

  it("persists lines (not the hydration flag) to localStorage", () => {
    useCart.getState().add(line(), 2);
    const saved = JSON.parse(localStorage.getItem("flockoff-cart")!);
    expect(saved.state.lines[0].quantity).toBe(2);
    expect(saved.state).not.toHaveProperty("hydrated");
  });
});
