import { execSync } from "node:child_process";
import { E2E_ADMIN } from "../../playwright.config";
import { prepareTestDatabase } from "../prepare-test-db";
import { TEST_DATABASE_URL } from "../test-db";

/**
 * Schema up to date + seed data. The seed is idempotent (upserts) and resets seeded stock to the
 * same deterministic values every run, so the checkout test always starts from a known state.
 * The command string is constant (no interpolated input).
 */
export default function globalSetup() {
  prepareTestDatabase();
  execSync("pnpm exec prisma db seed", {
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      SEED_ADMIN_EMAIL: E2E_ADMIN.email,
      SEED_ADMIN_PASSWORD: E2E_ADMIN.password,
    },
  });
}
