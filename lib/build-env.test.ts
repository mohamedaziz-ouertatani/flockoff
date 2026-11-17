import { describe, expect, it } from "vitest";
import { resolveBuildDbEnv } from "./build-env";

const POOLED = "postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require";
const DIRECT = "postgresql://u:p@ep-x.neon.tech/db?sslmode=require";

describe("resolveBuildDbEnv", () => {
  it("uses DATABASE_URL and DIRECT_URL when set", () => {
    expect(resolveBuildDbEnv({ DATABASE_URL: POOLED, DIRECT_URL: DIRECT })).toEqual({
      ok: true,
      databaseUrl: POOLED,
      databaseFrom: "DATABASE_URL",
      directUrl: DIRECT,
      directFrom: "DIRECT_URL",
    });
  });

  it("falls back to the Neon integration's DATABASE_URL_UNPOOLED", () => {
    expect(resolveBuildDbEnv({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT })).toMatchObject({
      ok: true,
      directUrl: DIRECT,
      directFrom: "DATABASE_URL_UNPOOLED",
    });
  });

  it("works with only the Supabase integration's variables", () => {
    expect(resolveBuildDbEnv({ POSTGRES_PRISMA_URL: POOLED, POSTGRES_URL_NON_POOLING: DIRECT })).toEqual({
      ok: true,
      databaseUrl: POOLED,
      databaseFrom: "POSTGRES_PRISMA_URL",
      directUrl: DIRECT,
      directFrom: "POSTGRES_URL_NON_POOLING",
    });
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

  it("explains a missing pooled URL", () => {
    const r = resolveBuildDbEnv({ DIRECT_URL: DIRECT });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join("\n")).toMatch(/DATABASE_URL is not set/);
  });
});
