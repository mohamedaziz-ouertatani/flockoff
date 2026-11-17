import { execSync } from "node:child_process";
import { assertIsTestDatabase, TEST_DATABASE_URL } from "./test-db";

/**
 * Brings the test database's schema up to date. Non-destructive on purpose: `migrate deploy`
 * only applies pending migrations (creating the database if needed) and never drops data.
 * Tests don't need a wipe because every fixture uses unique random slugs/ids.
 *
 * The command string is constant (no interpolated input).
 */
export function prepareTestDatabase() {
  assertIsTestDatabase();
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
  });
}
