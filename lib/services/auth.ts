import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hit, LIMITS, refund } from "@/lib/services/rate-limit";
import { createTrustedDeviceToken, isTrustedDevice } from "@/lib/services/trusted-device";
import type { LoginInput } from "@/lib/validation/auth";

export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Real hash generated once, so unknown emails cost the same time as wrong passwords.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("flockoff-dummy-password", BCRYPT_ROUNDS));

/**
 * What a trusted-device token is bound to: the account and its current password hash. Changing
 * the password (new salt, new hash) silently revokes every device token issued before it.
 */
function deviceBinding(user: { id: string; passwordHash: string }) {
  const fingerprint = createHash("sha256").update(user.passwordHash).digest("base64url").slice(0, 22);
  return `${user.id}|${fingerprint}`;
}

/** A fresh trusted-device token for this user's current password (null without AUTH_SECRET). */
export function deviceTokenFor(user: { id: string; passwordHash: string }) {
  return createTrustedDeviceToken(deviceBinding(user));
}

type SessionUser ={ id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" };

export type LoginResult =
  | { status: "ok"; user: SessionUser; /** Fresh trusted-device token to store in the browser (null without AUTH_SECRET). */ deviceToken: string | null }
  | { status: "invalid" }
  | { status: "rate_limited"; retryAfterMs: number };

/**
 * Login with brute-force protection. Every attempt counts against per-IP, per-email+IP and
 * per-account limits; over any of them we refuse *without* checking the password (which also
 * skips the bcrypt cost). A correct password refunds the failure counters, so customers who
 * log in normally never accumulate strikes.
 *
 * A valid `deviceToken` (from an earlier successful login on this browser, still matching the
 * account's current password) moves the per-account count into a separate trusted bucket:
 * IP-rotating attackers without a token fill the normal bucket and can't lock the customer out of
 * their own device, while a stolen token is still capped per account and per IP.
 */
export async function attemptLogin(input: LoginInput, ip: string, { deviceToken }: { deviceToken?: string } = {}): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const trusted = !!user && isTrustedDevice(deviceToken, deviceBinding(user));
  const accountLimit = trusted ? LIMITS.loginPerEmailTrusted : LIMITS.loginPerEmail;

  const checks = await Promise.all([
    hit(LIMITS.loginPerIp, ip),
    hit(LIMITS.loginPerEmailIp, `${input.email}|${ip}`),
    hit(accountLimit, input.email),
  ]);
  const blocked = checks.filter((c) => !c.allowed);
  if (blocked.length > 0) {
    return { status: "rate_limited", retryAfterMs: Math.max(...blocked.map((c) => c.retryAfterMs)) };
  }

  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return { status: "invalid" };

  await Promise.all([refund(LIMITS.loginPerEmailIp, `${input.email}|${ip}`), refund(accountLimit, input.email)]);
  return { status: "ok", user: toSessionUser(user), deviceToken: deviceTokenFor(user) };
}

function toSessionUser(user: { id: string; email: string; firstName: string; lastName: string; role: SessionUser["role"] }): SessionUser {
  return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role };
}

/** Returns the user (without hash) if the credentials are valid, otherwise null. */
export async function verifyCredentials({ email, password }: LoginInput): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return null;
  return toSessionUser(user);
}
