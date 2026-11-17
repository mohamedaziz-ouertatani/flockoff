import path from "node:path";
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/test-db";

export default defineConfig({
  resolve: {
    tsconfigPaths: true, // "@/..." imports, same as the app
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL },
          // Tests share one database; run files one at a time.
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
