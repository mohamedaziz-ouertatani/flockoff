import { z } from "zod";
import { tndToMillimes } from "@/lib/money";

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,64}$/);

/** "180" / "180.5" TND in the URL -> integer millimes. Invalid -> undefined. */
const tndParam = z
  .string()
  .trim()
  .transform((s, ctx) => {
    try {
      const v = tndToMillimes(s);
      if (v < 0) throw new Error();
      return v;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid amount" });
      return z.NEVER;
    }
  });

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/**
 * Shop filters live in URL search params. Parsing is lenient: any invalid value is dropped
 * rather than erroring, because people edit and share these URLs by hand.
 */
export const shopFiltersSchema = z.object({
  category: z.preprocess(first, slug.optional()).catch(undefined),
  collection: z.preprocess(first, slug.optional()).catch(undefined),
  min: z.preprocess(first, tndParam.optional()).catch(undefined),
  max: z.preprocess(first, tndParam.optional()).catch(undefined),
  sort: z.preprocess(first, z.enum(SORT_OPTIONS).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).optional()).catch(undefined),
});

export type ShopFilters = z.infer<typeof shopFiltersSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseShopFilters(params: RawSearchParams): ShopFilters {
  const f = shopFiltersSchema.parse(params);
  // A swapped range is almost certainly a typo: normalise instead of returning nothing.
  if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
    [f.min, f.max] = [f.max, f.min];
  }
  return f;
}

export const searchQuerySchema = z.preprocess(
  first,
  z
    .string()
    .trim()
    .transform((s) => s.slice(0, 100))
    .catch(""),
);

export function parseSearchQuery(params: RawSearchParams): string {
  return searchQuerySchema.parse(params.q ?? "") as string;
}
