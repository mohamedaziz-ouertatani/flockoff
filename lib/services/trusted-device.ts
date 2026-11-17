import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * "Trusted device" tokens: after a successful login the browser gets a signed, httpOnly cookie
 * bound to that account's email. A browser presenting a valid one skips the global per-account
 * login limit, so an attacker spraying guesses from many IPs can't lock the real customer out of
 * a device they've used before. The per-email+IP and per-IP limits still apply to it.
 *
 * Token format: `<expiresAtMs>.<base64url HMAC-SHA256(AUTH_SECRET, "td1|" + email + "|" + expiresAtMs)>`.
 * Nothing personal is stored in the cookie itself.
 */
export const TRUSTED_DEVICE_COOKIE = "fo_td";
export const TRUSTED_DEVICE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function sign(email: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`td1|${email}|${expiresAt}`).digest("base64url");
}

function secretOrNull(secret = process.env.AUTH_SECRET) {
  return secret && secret.length > 0 ? secret : null;
}

/** Null when no AUTH_SECRET is configured (the exemption is then simply never granted). */
export function createTrustedDeviceToken(email: string, now = Date.now(), secret?: string): string | null {
  const key = secretOrNull(secret);
  if (!key) return null;
  const expiresAt = now + TRUSTED_DEVICE_TTL_MS;
  return `${expiresAt}.${sign(email, expiresAt, key)}`;
}

export function isTrustedDevice(token: string | null | undefined, email: string, now = Date.now(), secret?: string): boolean {
  const key = secretOrNull(secret);
  if (!key || !token || token.length > 200) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(email, expiresAt, key));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Reads one cookie from a raw `Cookie` header. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}
