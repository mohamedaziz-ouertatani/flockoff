import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiting stored in Postgres, so it holds across serverless instances.
 *
 * `hit` atomically increments a counter and returns the new count (INSERT … ON CONFLICT DO UPDATE
 * … RETURNING), so concurrent requests can't all slip under the limit. Keys are hashed, so emails
 * are never stored in clear.
 */
export type Limit = { name: string; max: number; windowMs: number };

export const LIMITS = {
  /** Any login attempt from one IP. Generous: shared networks (offices, mobile carriers). */
  loginPerIp: { name: "login:ip", max: 30, windowMs: 15 * 60_000 },
  /** Failed logins for one account from one IP. The main brute-force brake. */
  loginPerEmailIp: { name: "login:email-ip", max: 5, windowMs: 15 * 60_000 },
  /** Failed logins for one account from anywhere. Loose, so an attacker can't easily lock a customer out. */
  loginPerEmail: { name: "login:email", max: 50, windowMs: 60 * 60_000 },
  /** Failed logins on one account from its trusted devices (a separate bucket, so attackers can't
   *  exhaust it without a valid device token, but a stolen token still can't guess without limit). */
  loginPerEmailTrusted: { name: "login:email:trusted", max: 50, windowMs: 60 * 60_000 },
  /** New accounts from one IP. */
  signupPerIp: { name: "signup:ip", max: 10, windowMs: 60 * 60_000 },
  /** Wrong current passwords on the change-password form, per account (a stolen session can't brute-force it). */
  passwordChangePerUser: { name: "password-change:user", max: 5, windowMs: 15 * 60_000 },
} as const satisfies Record<string, Limit>;

function keyFor(limit: Limit, subject: string) {
  const digest = createHash("sha256").update(subject.toLowerCase()).digest("base64url").slice(0, 32);
  return `${limit.name}:${digest}`;
}

function windowStart(limit: Limit, now: number) {
  return new Date(Math.floor(now / limit.windowMs) * limit.windowMs);
}

export type HitResult = { allowed: boolean; count: number; retryAfterMs: number };

/** Counts one event against `limit` for `subject` and says whether it's within the limit. */
export async function hit(limit: Limit, subject: string, now = Date.now()): Promise<HitResult> {
  const start = windowStart(limit, now);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${keyFor(limit, subject)}, ${start}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"
  `;
  const count = Number(rows[0].count);
  maybePrune(now);
  return { allowed: count <= limit.max, count, retryAfterMs: start.getTime() + limit.windowMs - now };
}

/** Takes back one event, e.g. a login that turned out to be correct shouldn't count as a failure. */
export async function refund(limit: Limit, subject: string, now = Date.now()) {
  await prisma.$executeRaw`
    UPDATE "RateLimit" SET "count" = GREATEST("count" - 1, 0)
    WHERE "key" = ${keyFor(limit, subject)} AND "windowStart" = ${windowStart(limit, now)}
  `;
}

/** About 1 call in 100 deletes windows older than a day, so the table stays small without a cron job. */
function maybePrune(now: number) {
  if (Math.random() >= 0.01) return;
  void prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < ${new Date(now - 24 * 60 * 60_000)}`.catch(() => undefined);
}

/**
 * Best-effort client IP. On Vercel the first x-forwarded-for entry is set by the platform and is
 * trustworthy; behind other proxies make sure they overwrite (not append to) this header.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** "15 minutes", "1 minute" */
export function humanizeWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
