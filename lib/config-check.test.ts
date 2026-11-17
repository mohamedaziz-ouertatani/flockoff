import { describe, expect, it } from "vitest";
import { checkProductionConfig } from "./config-check";

const GOOD_VERCEL = {
  VERCEL: "1",
  AUTH_SECRET: "x".repeat(44),
  DATABASE_URL: "postgresql://u:p@ep-cool-123-pooler.eu-central-1.aws.neon.tech/flockoff?sslmode=require",
  STORAGE_DRIVER: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "flockoff",
  CLOUDINARY_API_KEY: "123",
  CLOUDINARY_API_SECRET: "abc",
  NEXT_PUBLIC_SITE_URL: "https://flockoff.tn",
};

describe("checkProductionConfig", () => {
  it("accepts a complete Vercel configuration", () => {
    expect(checkProductionConfig(GOOD_VERCEL)).toEqual({ errors: [], warnings: [] });
  });

  it("accepts the self-hosted e2e configuration (local images, trusted host)", () => {
    const r = checkProductionConfig({
      AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      AUTH_TRUST_HOST: "true",
      DATABASE_URL: "postgresql://flockoff:flockoff@localhost:5434/flockoff_test",
      STORAGE_DRIVER: "local",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
    });
    expect(r.errors).toEqual([]);
  });

  it("rejects missing, placeholder and short secrets", () => {
    for (const AUTH_SECRET of [undefined, "replace-me", "short"]) {
      expect(checkProductionConfig({ ...GOOD_VERCEL, AUTH_SECRET }).errors.join()).toMatch(/AUTH_SECRET/);
    }
  });

  it("rejects local image storage on Vercel, and incomplete Cloudinary keys", () => {
    expect(checkProductionConfig({ ...GOOD_VERCEL, STORAGE_DRIVER: undefined }).errors.join()).toMatch(/persistent disk/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, CLOUDINARY_API_SECRET: "" }).errors.join()).toMatch(/CLOUDINARY_API_SECRET is not set/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, STORAGE_DRIVER: "s3" }).errors.join()).toMatch(/must be 'local' or 'cloudinary'/);
  });

  it("rejects a missing, invalid or localhost database on Vercel", () => {
    expect(checkProductionConfig({ ...GOOD_VERCEL, DATABASE_URL: undefined }).errors.join()).toMatch(/DATABASE_URL is not set/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, DATABASE_URL: "nope" }).errors.join()).toMatch(/not a valid URL/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, DATABASE_URL: "postgresql://u:p@localhost:5432/db" }).errors.join()).toMatch(/localhost/);
  });

  it("warns about the Supabase transaction pooler without pgbouncer=true", () => {
    const url = "postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres";
    expect(checkProductionConfig({ ...GOOD_VERCEL, DATABASE_URL: url }).warnings.join()).toMatch(/pgbouncer=true/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, DATABASE_URL: `${url}?pgbouncer=true&connection_limit=1` }).warnings).toEqual([]);
  });

  it("requires AUTH_TRUST_HOST or AUTH_URL when self-hosting", () => {
    const selfHosted = { ...GOOD_VERCEL, VERCEL: undefined };
    expect(checkProductionConfig(selfHosted).errors.join()).toMatch(/UntrustedHost/);
    expect(checkProductionConfig({ ...selfHosted, AUTH_URL: "https://flockoff.tn" }).errors).toEqual([]);
  });

  it("warns about a missing or non-https site URL", () => {
    expect(checkProductionConfig({ ...GOOD_VERCEL, NEXT_PUBLIC_SITE_URL: undefined }).warnings.join()).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(checkProductionConfig({ ...GOOD_VERCEL, NEXT_PUBLIC_SITE_URL: "http://flockoff.tn" }).warnings.join()).toMatch(/https/);
  });
});

describe("checkProductionConfig with the Supabase integration", () => {
  it("accepts POSTGRES_PRISMA_URL in place of DATABASE_URL", () => {
    const env = { ...GOOD_VERCEL, DATABASE_URL: undefined, POSTGRES_PRISMA_URL: "postgresql://u:p@aws-0-eu.pooler.supabase.com:6543/postgres?pgbouncer=true" };
    expect(checkProductionConfig(env)).toEqual({ errors: [], warnings: [] });
  });
});
