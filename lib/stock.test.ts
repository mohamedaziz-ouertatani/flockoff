import { describe, expect, it } from "vitest";
import { clampQuantity } from "./stock";

describe("clampQuantity", () => {
  it("caps at available stock (old bug: 25 added when 20 in stock)", () => {
    expect(clampQuantity(25, 20)).toBe(20);
  });

  it("never goes below 1 while stock exists", () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(-3, 5)).toBe(1);
  });

  it("returns 0 when nothing is available", () => {
    expect(clampQuantity(3, 0)).toBe(0);
    expect(clampQuantity(3, -2)).toBe(0);
  });

  it("floors fractional input and handles NaN", () => {
    expect(clampQuantity(2.9, 5)).toBe(2);
    expect(clampQuantity(Number.NaN, 5)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY, 5)).toBe(1);
  });

  it("keeps valid quantities unchanged", () => {
    expect(clampQuantity(3, 5)).toBe(3);
    expect(clampQuantity(5, 5)).toBe(5);
  });
});
