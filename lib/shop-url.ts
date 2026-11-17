import { millimesToTndInput } from "@/lib/money";
import type { ShopFilters } from "@/lib/validation/catalog";

/**
 * Builds a /shop URL from the current filters plus a patch. `null` in the patch removes a key.
 * Any change other than `page` resets pagination, so you never land on an empty page 4.
 */
export function shopHref(current: ShopFilters, patch: { [K in keyof ShopFilters]?: ShopFilters[K] | null } = {}) {
  const next: ShopFilters = { ...current };
  for (const [k, v] of Object.entries(patch) as [keyof ShopFilters, unknown][]) {
    if (v === null || v === undefined) delete next[k];
    else (next as Record<string, unknown>)[k] = v;
  }
  if (!("page" in patch)) delete next.page;

  const sp = new URLSearchParams();
  if (next.category) sp.set("category", next.category);
  if (next.collection) sp.set("collection", next.collection);
  if (next.min !== undefined) sp.set("min", millimesToTndInput(next.min));
  if (next.max !== undefined) sp.set("max", millimesToTndInput(next.max));
  if (next.sort && next.sort !== "newest") sp.set("sort", next.sort);
  if (next.page && next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/shop?${qs}` : "/shop";
}
