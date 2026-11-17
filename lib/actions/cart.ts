"use server";

import { z } from "zod";
import { getVariantSnapshots } from "@/lib/services/catalog";
import { MAX_CART_LINES } from "@/lib/validation/checkout";

const idsSchema = z.array(z.string().trim().min(1).max(40)).max(MAX_CART_LINES);

/** Read-only: fresh price/stock for the variants in a browser cart. */
export async function getCartSnapshot(variantIds: unknown) {
  const parsed = idsSchema.safeParse(variantIds);
  if (!parsed.success) return [];
  return getVariantSnapshots([...new Set(parsed.data)]);
}
