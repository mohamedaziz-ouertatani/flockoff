import { defineConfig } from "prisma/config";

// With a config file, the Prisma CLI no longer loads .env by itself. Node's built-in loader keeps
// variables that are already set, so explicit overrides (the test database in e2e/CI, the
// production URL for db:create-admin) still win over .env. No .env on Vercel/CI: that's fine.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
