import { describe, expect, it } from "vitest";
import { productInputSchema } from "./admin";
import { signupSchema } from "./auth";
import { parseSearchQuery, parseShopFilters } from "./catalog";
import { placeOrderSchema } from "./checkout";

describe("parseShopFilters (URL search params)", () => {
  it("parses valid filters, TND prices to millimes", () => {
    expect(parseShopFilters({ category: "Hoodie", min: "100", max: "150.5", sort: "price-asc", page: "2" })).toEqual({
      category: "hoodie",
      collection: undefined,
      min: 100_000,
      max: 150_500,
      sort: "price-asc",
      page: 2,
    });
  });

  it("drops invalid values instead of failing the page", () => {
    expect(parseShopFilters({ min: "abc", sort: "bogus", page: "-3", category: "<script>" })).toEqual({
      category: undefined,
      collection: undefined,
      min: undefined,
      max: undefined,
      sort: undefined,
      page: undefined,
    });
  });

  it("swaps a reversed price range", () => {
    const f = parseShopFilters({ min: "150", max: "100" });
    expect([f.min, f.max]).toEqual([100_000, 150_000]);
  });

  it("uses the first value of repeated params", () => {
    expect(parseShopFilters({ category: ["jersey", "pants"] }).category).toBe("jersey");
  });
});

it("parseSearchQuery trims and caps length", () => {
  expect(parseSearchQuery({ q: "  hoodie  " })).toBe("hoodie");
  expect(parseSearchQuery({ q: "x".repeat(500) })).toHaveLength(100);
  expect(parseSearchQuery({})).toBe("");
});

describe("placeOrderSchema", () => {
  const valid = {
    firstName: " Amine ",
    lastName: "Ben Ali",
    email: "AMINE@Example.com",
    phone: "22 123 456",
    city: "Tunis",
    street: "12 Rue de Marseille",
    zip: "1000",
    items: [{ variantId: "v1", quantity: 2 }],
    expectedTotal: 367_000,
  };

  it("normalises input", () => {
    const r = placeOrderSchema.parse(valid);
    expect(r.firstName).toBe("Amine");
    expect(r.email).toBe("amine@example.com");
    expect(r.phone).toBe("+21622123456");
  });

  it("rejects duplicate cart lines (would bypass per-line stock checks)", () => {
    const r = placeOrderSchema.safeParse({ ...valid, items: [{ variantId: "v1", quantity: 1 }, { variantId: "v1", quantity: 1 }] });
    expect(r.success).toBe(false);
  });

  it("rejects an empty cart, bad ZIP, bad phone, silly quantities", () => {
    for (const patch of [
      { items: [] },
      { zip: "100" },
      { phone: "+33612345678" },
      { items: [{ variantId: "v1", quantity: 0 }] },
      { items: [{ variantId: "v1", quantity: 1000 }] },
      { items: [{ variantId: "v1", quantity: 1.5 }] },
    ]) {
      expect(placeOrderSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
    }
  });
});

describe("productInputSchema", () => {
  const base = {
    name: "Migration Tee",
    slug: "migration-tee",
    price: "75",
    categoryId: "c1",
    collectionId: "",
    description: "Tee",
    isFeatured: false,
    isActive: true,
    variants: [{ size: "M", stock: 5, expectedStock: null }],
  };

  it("converts the TND price and empty collection", () => {
    const r = productInputSchema.parse(base);
    expect(r.price).toBe(75_000);
    expect(r.collectionId).toBeNull();
  });

  it("rejects negative stock, zero price and bad slugs", () => {
    expect(productInputSchema.safeParse({ ...base, variants: [{ size: "M", stock: -1, expectedStock: null }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, price: "0" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    firstName: "Yasmine",
    lastName: "Trabelsi",
    email: " Yasmine@Example.COM ",
    phone: "",
    password: "correct horse",
    confirmPassword: "correct horse",
  };

  it("normalises email and treats an empty phone as none", () => {
    const r = signupSchema.parse(valid);
    expect(r.email).toBe("yasmine@example.com");
    expect(r.phone).toBeNull();
  });

  it("normalises a Tunisian phone when given", () => {
    expect(signupSchema.parse({ ...valid, phone: "22 123 456" }).phone).toBe("+21622123456");
    expect(signupSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });

  it("requires matching passwords of at least 8 characters", () => {
    expect(signupSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success).toBe(false);
    const mismatch = signupSchema.safeParse({ ...valid, confirmPassword: "correct horse!" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("rejects passwords bcrypt would silently truncate (> 72 bytes)", () => {
    const ok = "a".repeat(72);
    expect(signupSchema.safeParse({ ...valid, password: ok, confirmPassword: ok }).success).toBe(true);
    // 25 Arabic letters = 50 bytes in UTF-8; 37 of them = 74 bytes, over the limit despite being 37 chars.
    const arabic = "ب".repeat(37);
    expect(signupSchema.safeParse({ ...valid, password: arabic, confirmPassword: arabic }).success).toBe(false);
  });

  it("ignores any role field (it isn't part of the schema)", () => {
    const r = signupSchema.parse({ ...valid, role: "ADMIN" });
    expect(r).not.toHaveProperty("role");
  });
});
