import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { registerCustomer } from "@/lib/services/accounts";
import { attemptLogin } from "@/lib/services/auth";
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
