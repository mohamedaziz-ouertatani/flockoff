import { describe, expect, it } from "vitest";
import { formatTND, millimesToTndInput, SHIPPING_FEE_MILLIMES, tndToMillimes } from "./money";

describe("formatTND", () => {
  it("shows whole dinars without decimals", () => {
    expect(formatTND(180_000)).toBe("180 TND");
    expect(formatTND(7_000)).toBe("7 TND");
    expect(formatTND(0)).toBe("0 TND");
  });

  it("shows three decimals (millimes) otherwise", () => {
    expect(formatTND(180_500)).toBe("180.500 TND");
    expect(formatTND(5)).toBe("0.005 TND");
    expect(formatTND(1_050)).toBe("1.050 TND");
  });

  it("never produces the old '600. 00' style output", () => {
    for (const m of [600_000, 600_050, 123_456_789]) {
      expect(formatTND(m)).toMatch(/^\d+(\.\d{3})? TND$/);
    }
  });

  it("handles negatives (refund lines)", () => {
    expect(formatTND(-7_000)).toBe("-7 TND");
    expect(formatTND(-1_250)).toBe("-1.250 TND");
  });

  it("rejects floats so money can never be fractional millimes", () => {
    expect(() => formatTND(1.5)).toThrow(TypeError);
    expect(() => formatTND(Number.NaN)).toThrow(TypeError);
  });
});

describe("tndToMillimes", () => {
  it("parses whole and decimal TND without float drift", () => {
    expect(tndToMillimes("180")).toBe(180_000);
    expect(tndToMillimes("179.9")).toBe(179_900);
    expect(tndToMillimes("0.1")).toBe(100); // 0.1 * 1000 in floats would risk 100.00000000000001
    expect(tndToMillimes("600,00")).toBe(600_000); // comma decimal separator
    expect(tndToMillimes(7)).toBe(7_000);
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "abc", "1.2345", "1..2", "1e3", " 12 34 "]) {
      expect(() => tndToMillimes(bad)).toThrow();
    }
  });

  it("round-trips with millimesToTndInput", () => {
    for (const m of [0, 5, 100, 7_000, 179_900, 180_500, 1_234_567]) {
      expect(tndToMillimes(millimesToTndInput(m))).toBe(m);
    }
    expect(millimesToTndInput(179_900)).toBe("179.9");
  });
});

it("shipping is a flat 7 TND", () => {
  expect(SHIPPING_FEE_MILLIMES).toBe(7_000);
});
