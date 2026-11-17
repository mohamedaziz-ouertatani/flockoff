/**
 * `pnpm vercel-build`: apply pending migrations, then build. Resolves the direct database URL first
 * (see lib/build-env.ts) so a missing variable fails with instructions instead of a Prisma P1012.
 * Command strings are constant; only the environment is passed through.
 */
import { spawnSync } from "node:child_process";
import { resolveBuildDbEnv } from "../lib/build-env";

const db = resolveBuildDbEnv(process.env);
if (!db.ok) {
  console.error("\nCan't build: the database isn't configured.\n");
  for (const p of db.problems) console.error(`  - ${p}`);
  console.error("");
  process.exit(1);
}
if (db.databaseFrom !== "DATABASE_URL") console.log(`Using ${db.databaseFrom} as DATABASE_URL.`);
if (db.directFrom !== "DIRECT_URL") console.log(`Using ${db.directFrom} as DIRECT_URL for migrations.`);

const env = { ...process.env, DATABASE_URL: db.databaseUrl, DIRECT_URL: db.directUrl };
const run = (args: string[]) => {
  const r = spawnSync("pnpm", ["exec", ...args], { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run(["prisma", "migrate", "deploy"]);
run(["next", "build", "--turbopack"]);
