import { describe, expect, it } from "vitest";
import { formatTunisianPhone, normalizeTunisianPhone } from "./phone";

describe("normalizeTunisianPhone", () => {
  it.each([
    ["22123456", "+21622123456"],
    ["22 123 456", "+21622123456"],
    ["+216 22 123 456", "+21622123456"],
    ["00216-98.123.456", "+21698123456"],
    ["216 (55) 123 456", "+21655123456"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeTunisianPhone(input)).toBe(expected);
  });

  it.each(["", "1234567", "123456789", "+33 6 12 34 56 78", "02123456", "abcdefgh"])("rejects %j", (input) => {
    expect(normalizeTunisianPhone(input)).toBeNull();
  });
});

it("formats for display", () => {
  expect(formatTunisianPhone("+21622123456")).toBe("+216 22 123 456");
  expect(formatTunisianPhone("not a phone")).toBe("not a phone");
});
