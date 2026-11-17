/**
 * Clamps a requested quantity to [1, available]. Returns 0 when nothing is available.
 * Shared by the product page now and the cart in Phase 3, so the UI can never ask for more
 * than is in stock (the old site let 25 be added when only 20 existed). The server re-checks
 * at checkout regardless.
 */
export function clampQuantity(requested: number, available: number): number {
  const max = Math.max(0, Math.floor(available));
  if (max === 0) return 0;
  if (!Number.isFinite(requested)) return 1;
  return Math.min(max, Math.max(1, Math.floor(requested)));
}

export const LOW_STOCK_THRESHOLD = 3;
