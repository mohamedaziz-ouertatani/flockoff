import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { registerCustomer } from "@/lib/services/accounts";
import { attemptLogin, hashPassword } from "@/lib/services/auth";
import { hit, LIMITS, refund, type Limit } from "@/lib/services/rate-limit";
import { signupSchema } from "@/lib/validation/auth";

afterAll(() => prisma.$disconnect());

const uid = () => randomBytes(5).toString("hex");
const ip = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 255)).join(".")}`;
const testLimit = (max: number): Limit => ({ name: `test:${uid()}`, max, windowMs: 60_000 });

describe("hit / refund", () => {
  it("is atomic: 20 concurrent hits produce counts 1..20 and allow exactly `max`", async () => {
    const limit = testLimit(7);
    const results = await Promise.all(Array.from({ length: 20 }, () => hit(limit, "subject")));
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(results.filter((r) => r.allowed)).toHaveLength(7);
  });

  it("starts fresh in the next window", async () => {
    const limit = testLimit(1);
    const now = Date.now();
    expect((await hit(limit, "s", now)).allowed).toBe(true);
    expect((await hit(limit, "s", now)).allowed).toBe(false);
    expect((await hit(limit, "s", now + limit.windowMs)).allowed).toBe(true);
  });

  it("refund gives one back but never goes below zero", async () => {
    const limit = testLimit(1);
    const now = Date.now();
    await hit(limit, "s", now);
    await refund(limit, "s", now);
    await refund(limit, "s", now);
    expect((await hit(limit, "s", now)).count).toBe(1);
  });

  it("never stores the raw subject (emails are hashed)", async () => {
    const email = `secret-${uid()}@test.local`;
    await hit(testLimit(5), email);
    const leaked = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "RateLimit" WHERE "key" LIKE ${"%" + email + "%"}`;
    expect(Number(leaked[0].n)).toBe(0);
  });
});

describe("attemptLogin", () => {
  async function customer() {
    const email = `login-${uid()}@test.local`;
    const password = "correct horse battery";
    await registerCustomer(signupSchema.parse({ firstName: "R", lastName: "L", email, phone: "", password, confirmPassword: password }));
    return { email, password };
  }

  async function tokenFrom(email: string, password: string, from: string) {
    const r = await attemptLogin({ email, password }, from);
    if (r.status !== "ok" || !r.deviceToken) throw new Error(`login failed: ${r.status}`);
    return r.deviceToken;
  }

  it("after 5 wrong passwords from one IP, refuses even the right password from that IP, but not from another", async () => {
    const { email, password } = await customer();
    const attacker = ip();
    for (let i = 0; i < LIMITS.loginPerEmailIp.max; i++) {
      expect((await attemptLogin({ email, password: `guess-${i}` }, attacker)).status).toBe("invalid");
    }
    const blocked = await attemptLogin({ email, password }, attacker);
    expect(blocked.status).toBe("rate_limited");
    if (blocked.status === "rate_limited") expect(blocked.retryAfterMs).toBeGreaterThan(0);

    // The real customer elsewhere isn't locked out by the attacker.
    expect((await attemptLogin({ email, password }, ip())).status).toBe("ok");
  });

  it("successful logins don't accumulate strikes", async () => {
    const { email, password } = await customer();
    const home = ip();
    for (let i = 0; i < LIMITS.loginPerEmailIp.max + 3; i++) {
      expect((await attemptLogin({ email, password }, home)).status).toBe("ok");
    }
  });

  it("still caps guesses on one account when the attacker rotates (spoofed) IPs", async () => {
    const { email, password } = await customer();
    const statuses = [];
    for (let i = 0; i <= LIMITS.loginPerEmail.max; i++) {
      statuses.push((await attemptLogin({ email, password: `guess-${i}` }, ip())).status);
    }
    expect(statuses.slice(0, LIMITS.loginPerEmail.max).every((s) => s === "invalid")).toBe(true);
    expect(statuses.at(-1)).toBe("rate_limited");
    // Even the right password is refused for the rest of the hour, from any IP.
    expect((await attemptLogin({ email, password }, ip())).status).toBe("rate_limited");
  }, 120_000);

  it("a trusted device still logs in while the account is under an IP-rotating attack", async () => {
    const { email, password } = await customer();
    const home = ip();
    const deviceToken = await tokenFrom(email, password, home);

    for (let i = 0; i < LIMITS.loginPerEmail.max; i++) {
      await attemptLogin({ email, password: `guess-${i}` }, ip());
    }
    // New devices are locked out of the account...
    expect((await attemptLogin({ email, password }, ip())).status).toBe("rate_limited");
    // ...but the customer's own browser isn't.
    expect((await attemptLogin({ email, password }, home, { deviceToken })).status).toBe("ok");
    // A forged or foreign token doesn't help.
    expect((await attemptLogin({ email, password }, ip(), { deviceToken: `${Date.now() + 60_000}.forged` })).status).toBe("rate_limited");

    // A trusted device still gets only 5 wrong guesses per IP.
    for (let i = 0; i < LIMITS.loginPerEmailIp.max; i++) {
      expect((await attemptLogin({ email, password: `typo-${i}` }, home, { deviceToken })).status).toBe("invalid");
    }
    expect((await attemptLogin({ email, password }, home, { deviceToken })).status).toBe("rate_limited");
  }, 120_000);

  it("a stolen device token still has a per-account cap, even across rotating IPs", async () => {
    const { email, password } = await customer();
    const deviceToken = await tokenFrom(email, password, ip());
    const statuses = [];
    for (let i = 0; i <= LIMITS.loginPerEmailTrusted.max; i++) {
      statuses.push((await attemptLogin({ email, password: `guess-${i}` }, ip(), { deviceToken })).status);
    }
    expect(statuses.slice(0, LIMITS.loginPerEmailTrusted.max).every((s) => s === "invalid")).toBe(true);
    expect(statuses.at(-1)).toBe("rate_limited");
  }, 120_000);

  it("changing the password revokes existing device tokens", async () => {
    const { email, password } = await customer();
    const deviceToken = await tokenFrom(email, password, ip());
    const newPassword = "a whole new password";
    await prisma.user.update({ where: { email }, data: { passwordHash: await hashPassword(newPassword) } });

    for (let i = 0; i < LIMITS.loginPerEmail.max; i++) {
      await attemptLogin({ email, password: `guess-${i}` }, ip());
    }
    // The old token no longer grants the trusted bucket.
    expect((await attemptLogin({ email, password: newPassword }, ip(), { deviceToken })).status).toBe("rate_limited");
  }, 120_000);

  it("caps attempts per IP across many different emails", async () => {
    const attacker = ip();
    const results = [];
    for (let i = 0; i <= LIMITS.loginPerIp.max; i++) {
      results.push((await attemptLogin({ email: `nobody-${uid()}@test.local`, password: "x" }, attacker)).status);
    }
    expect(results.slice(0, LIMITS.loginPerIp.max).every((s) => s === "invalid")).toBe(true);
    expect(results.at(-1)).toBe("rate_limited");
  });
});
