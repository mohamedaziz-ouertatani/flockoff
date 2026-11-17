import { describe, expect, it } from "vitest";
import { createTrustedDeviceToken, isTrustedDevice, readCookie, TRUSTED_DEVICE_TTL_MS } from "./trusted-device";

const SECRET = "unit-test-secret";
const NOW = 1_800_000_000_000;

describe("trusted-device tokens", () => {
  const token = createTrustedDeviceToken("a@test.local", NOW, SECRET)!;

  it("accepts a token for the same email", () => {
    expect(isTrustedDevice(token, "a@test.local", NOW + 1000, SECRET)).toBe(true);
  });

  it("is bound to the email", () => {
    expect(isTrustedDevice(token, "b@test.local", NOW, SECRET)).toBe(false);
  });

  it("expires", () => {
    expect(isTrustedDevice(token, "a@test.local", NOW + TRUSTED_DEVICE_TTL_MS, SECRET)).toBe(false);
  });

  it("rejects a different secret, an extended expiry, and garbage", () => {
    expect(isTrustedDevice(token, "a@test.local", NOW, "other-secret")).toBe(false);
    const [, mac] = token.split(".");
    expect(isTrustedDevice(`${NOW + TRUSTED_DEVICE_TTL_MS * 10}.${mac}`, "a@test.local", NOW, SECRET)).toBe(false);
    for (const bad of ["", ".", "abc", "123.", `${NOW + 5}.x`, undefined, null]) {
      expect(isTrustedDevice(bad, "a@test.local", NOW, SECRET)).toBe(false);
    }
  });

  it("is disabled without a secret", () => {
    expect(createTrustedDeviceToken("a@test.local", NOW, "")).toBeNull();
    expect(isTrustedDevice(token, "a@test.local", NOW, "")).toBe(false);
  });
});

describe("readCookie", () => {
  it("finds a cookie by exact name", () => {
    expect(readCookie("x=1; fo_td=abc.def; fo_td2=no", "fo_td")).toBe("abc.def");
    expect(readCookie("xfo_td=1", "fo_td")).toBeUndefined();
    expect(readCookie(null, "fo_td")).toBeUndefined();
  });
});
