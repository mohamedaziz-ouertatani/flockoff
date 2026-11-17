import { describe, expect, it } from "vitest";
import { computeTotals } from "./pricing";

describe("computeTotals", () => {
  it("subtotal + flat 7 TND shipping = total", () => {
    expect(
      computeTotals([
        { unitPrice: 180_000, quantity: 2 },
        { unitPrice: 75_000, quantity: 1 },
      ]),
    ).toEqual({ itemCount: 3, subtotal: 435_000, shippingFee: 7_000, total: 442_000 });
  });

  it("item count is total quantity, not number of lines (badge = checkout count)", () => {
    expect(computeTotals([{ unitPrice: 1_000, quantity: 4 }, { unitPrice: 1_000, quantity: 1 }]).itemCount).toBe(5);
  });

  it("charges no shipping on an empty cart", () => {
    expect(computeTotals([])).toEqual({ itemCount: 0, subtotal: 0, shippingFee: 0, total: 0 });
  });

  it("rejects invalid lines instead of producing a wrong total", () => {
    expect(() => computeTotals([{ unitPrice: 1.5, quantity: 1 }])).toThrow(RangeError);
    expect(() => computeTotals([{ unitPrice: -1, quantity: 1 }])).toThrow(RangeError);
    expect(() => computeTotals([{ unitPrice: 1_000, quantity: 0 }])).toThrow(RangeError);
    expect(() => computeTotals([{ unitPrice: 1_000, quantity: 2.5 }])).toThrow(RangeError);
  });

  it("refuses totals beyond safe integer range", () => {
    expect(() => computeTotals([{ unitPrice: Number.MAX_SAFE_INTEGER, quantity: 2 }])).toThrow(RangeError);
  });
});
