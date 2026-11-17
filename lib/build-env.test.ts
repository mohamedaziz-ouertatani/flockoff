import { describe, expect, it } from "vitest";
import { resolveBuildDbEnv } from "./build-env";

const POOLED = "postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require";
const DIRECT = "postgresql://u:p@ep-x.neon.tech/db?sslmode=require";

describe("resolveBuildDbEnv", () => {
  it("uses DIRECT_URL when set", () => {
    expect(resolveBuildDbEnv({ DATABASE_URL: POOLED, DIRECT_URL: DIRECT })).toEqual({ ok: true, directUrl: DIRECT, directFrom: "DIRECT_URL" });
  });

  it("falls back to the Neon integration's DATABASE_URL_UNPOOLED", () => {
    expect(resolveBuildDbEnv({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT })).toEqual({
      ok: true,
      directUrl: DIRECT,
      directFrom: "DATABASE_URL_UNPOOLED",
    });
  });

  it("falls back to the Supabase integration's POSTGRES_URL_NON_POOLING", () => {
    const r = resolveBuildDbEnv({ DATABASE_URL: POOLED, POSTGRES_URL_NON_POOLING: DIRECT });
    expect(r).toMatchObject({ ok: true, directFrom: "POSTGRES_URL_NON_POOLING" });
  });

  it("prefers an explicit DIRECT_URL over integration names", () => {
    expect(resolveBuildDbEnv({ DATABASE_URL: POOLED, DIRECT_URL: DIRECT, DATABASE_URL_UNPOOLED: "other" })).toMatchObject({ directUrl: DIRECT });
  });

  it("explains a missing direct URL, with where to set it on Vercel", () => {
    const r = resolveBuildDbEnv({ VERCEL: "1", VERCEL_ENV: "preview", DATABASE_URL: POOLED });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.problems.join("\n")).toMatch(/DIRECT_URL is not set/);
      expect(r.problems.join("\n")).toMatch(/"preview" environment/);
    }
  });

  it("points Supabase users from POSTGRES_PRISMA_URL to DATABASE_URL", () => {
    const r = resolveBuildDbEnv({ POSTGRES_PRISMA_URL: POOLED, POSTGRES_URL_NON_POOLING: DIRECT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join("\n")).toMatch(/add DATABASE_URL with that same value/);
  });
});
