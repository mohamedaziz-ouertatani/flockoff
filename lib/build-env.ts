/**
 * Database URLs for the build step (`prisma migrate deploy`). Pure, so it can be unit-tested.
 *
 * Only migrations need the direct (non-pooled) URL; the running app uses DATABASE_URL alone. Vercel's
 * database integrations create it under their own names, so those are accepted as fallbacks:
 *   - Neon:     DATABASE_URL (pooled) + DATABASE_URL_UNPOOLED
 *   - Supabase: POSTGRES_PRISMA_URL (pooled) + POSTGRES_URL_NON_POOLING
 */
type Env = Record<string, string | undefined>;

const DIRECT_FALLBACKS = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"] as const;

export type BuildDbEnv =
  | { ok: true; directUrl: string; directFrom: string }
  | { ok: false; problems: string[] };

const where = (env: Env) =>
  env.VERCEL
    ? `In Vercel: Project → Settings → Environment Variables, for the "${env.VERCEL_ENV ?? "production"}" environment, then redeploy.`
    : "Set it in the build environment.";

export function resolveBuildDbEnv(env: Env): BuildDbEnv {
  const problems: string[] = [];

  if (!env.DATABASE_URL) {
    problems.push(
      env.POSTGRES_PRISMA_URL
        ? "DATABASE_URL is not set. Your Supabase integration provides POSTGRES_PRISMA_URL: add DATABASE_URL with that same value (the app reads DATABASE_URL at runtime)."
        : "DATABASE_URL is not set (the pooled connection string the app uses at runtime).",
    );
  }

  let directUrl = env.DIRECT_URL;
  let directFrom = "DIRECT_URL";
  if (!directUrl) {
    const found = DIRECT_FALLBACKS.find((k) => env[k]);
    if (found) {
      directUrl = env[found];
      directFrom = found;
    }
  }
  if (!directUrl) {
    problems.push(
      "DIRECT_URL is not set (the direct, non-pooled connection string; migrations can't run through a pooler). " +
        "Neon: the connection string without '-pooler' in the host. Supabase: the session pooler or direct connection, port 5432.",
    );
  }

  if (problems.length) return { ok: false, problems: [...problems, where(env)] };
  return { ok: true, directUrl: directUrl!, directFrom };
}
