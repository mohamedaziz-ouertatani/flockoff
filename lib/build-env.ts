/**
 * Database URLs for the build step (`prisma migrate deploy`). Pure, so it can be unit-tested.
 *
 * Vercel's database integrations use their own variable names, accepted as fallbacks:
 *   - Neon:     DATABASE_URL (pooled)        + DATABASE_URL_UNPOOLED (direct)
 *   - Supabase: POSTGRES_PRISMA_URL (pooled) + POSTGRES_URL_NON_POOLING (direct)
 * The running app reads the pooled URL the same way (lib/db.ts); only migrations need the direct one.
 */
type Env = Record<string, string | undefined>;

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL"] as const;
const DIRECT = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"] as const;

export type BuildDbEnv =
  | { ok: true; databaseUrl: string; databaseFrom: string; directUrl: string; directFrom: string }
  | { ok: false; problems: string[] };

const where = (env: Env) =>
  env.VERCEL
    ? `In Vercel: Project → Settings → Environment Variables, for the "${env.VERCEL_ENV ?? "production"}" environment, then redeploy.`
    : "Set it in the build environment.";

const first = (env: Env, names: readonly string[]) => names.find((k) => env[k]);

export function resolveBuildDbEnv(env: Env): BuildDbEnv {
  const problems: string[] = [];
  const databaseFrom = first(env, POOLED);
  const directFrom = first(env, DIRECT);

  if (!databaseFrom) {
    problems.push("DATABASE_URL is not set (the pooled connection string the app uses at runtime), and no POSTGRES_PRISMA_URL from the Supabase integration either.");
  }
  if (!directFrom) {
    problems.push(
      "DIRECT_URL is not set (the direct, non-pooled connection string; migrations can't run through a pooler). " +
        "Neon: the connection string without '-pooler' in the host. Supabase: the session pooler or direct connection, port 5432.",
    );
  }

  if (!databaseFrom || !directFrom) return { ok: false, problems: [...problems, where(env)] };
  return { ok: true, databaseUrl: env[databaseFrom]!, databaseFrom, directUrl: env[directFrom]!, directFrom };
}
