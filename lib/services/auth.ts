import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hit, LIMITS, refund } from "@/lib/services/rate-limit";
import type { LoginInput } from "@/lib/validation/auth";

export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Real hash generated once, so unknown emails cost the same time as wrong passwords.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("flockoff-dummy-password", BCRYPT_ROUNDS));

export type LoginResult =
  | { status: "ok"; user: NonNullable<Awaited<ReturnType<typeof verifyCredentials>>> }
  | { status: "invalid" }
  | { status: "rate_limited"; retryAfterMs: number };

/**
 * Login with brute-force protection. Every attempt counts against per-IP, per-email+IP and
 * per-email limits; over any of them we refuse *without* checking the password (which also
 * skips the bcrypt cost). A correct password refunds the failure counters, so customers who
 * log in normally never accumulate strikes.
 */
export async function attemptLogin(input: LoginInput, ip: string): Promise<LoginResult> {
  const checks = await Promise.all([
    hit(LIMITS.loginPerIp, ip),
    hit(LIMITS.loginPerEmailIp, `${input.email}|${ip}`),
    hit(LIMITS.loginPerEmail, input.email),
  ]);
  const blocked = checks.filter((c) => !c.allowed);
  if (blocked.length > 0) {
    return { status: "rate_limited", retryAfterMs: Math.max(...blocked.map((c) => c.retryAfterMs)) };
  }

  const user = await verifyCredentials(input);
  if (!user) return { status: "invalid" };

  await Promise.all([refund(LIMITS.loginPerEmailIp, `${input.email}|${ip}`), refund(LIMITS.loginPerEmail, input.email)]);
  return { status: "ok", user };
}

/** Returns the user (without hash) if the credentials are valid, otherwise null. */
export async function verifyCredentials({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
  };
}
