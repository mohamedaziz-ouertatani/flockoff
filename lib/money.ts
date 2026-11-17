/**
 * Money is stored as integer millimes (1 TND = 1000 millimes). Never use floats.
 * This is the single formatter for prices everywhere in the app.
 *
 *   formatTND(180000) -> "180 TND"
 *   formatTND(180500) -> "180.500 TND"
 *   formatTND(7000)   -> "7 TND"
 */
export const MILLIMES_PER_TND = 1000;

export function formatTND(millimes: number): string {
  if (!Number.isSafeInteger(millimes)) {
    throw new TypeError(`formatTND expects integer millimes, got ${millimes}`);
  }
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(millimes);
  const dinars = Math.floor(abs / MILLIMES_PER_TND);
  const rest = abs % MILLIMES_PER_TND;
  const dinarsStr = String(dinars);
  if (rest === 0) return `${sign}${dinarsStr} TND`;
  return `${sign}${dinarsStr}.${String(rest).padStart(3, "0")} TND`;
}

/** Converts a whole/decimal TND amount (e.g. from an admin form) to millimes without float drift. */
export function tndToMillimes(input: string | number): number {
  const s = String(input).trim();
  const m = /^(-?)(\d+)(?:[.,](\d{1,3}))?$/.exec(s);
  if (!m) throw new TypeError(`Invalid TND amount: "${s}"`);
  const [, neg, whole, frac = ""] = m;
  const value = Number(whole) * MILLIMES_PER_TND + Number(frac.padEnd(3, "0"));
  return neg ? -value : value;
}

/** Millimes -> plain TND string for inputs/URLs ("180", "180.5"). No currency suffix. */
export function millimesToTndInput(millimes: number): string {
  if (!Number.isSafeInteger(millimes)) {
    throw new TypeError(`millimesToTndInput expects integer millimes, got ${millimes}`);
  }
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(millimes);
  const dinars = Math.floor(abs / MILLIMES_PER_TND);
  const rest = abs % MILLIMES_PER_TND;
  if (rest === 0) return `${sign}${dinars}`;
  return `${sign}${dinars}.${String(rest).padStart(3, "0").replace(/0+$/, "")}`;
}

/** Flat shipping fee: 7 TND. */
export const SHIPPING_FEE_MILLIMES = 7 * MILLIMES_PER_TND;
