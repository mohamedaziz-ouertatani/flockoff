import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/test-db";

/**
 * End-to-end tests run a production build on its own port, output folder and test database,
 * so they never touch the dev server or dev data.
 */
const PORT = 3100;

export const E2E_ADMIN = { email: "e2e-admin@flockoff.test", password: "e2e-only-password-123" };

const serverEnv = {
  NEXT_DIST_DIR: ".next-e2e",
  DATABASE_URL: TEST_DATABASE_URL,
  DIRECT_URL: TEST_DATABASE_URL,
  AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
  AUTH_TRUST_HOST: "true",
  STORAGE_DRIVER: "local",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    env: serverEnv,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
  },
});
