/**
 * Production configuration check, run once at server start (instrumentation.ts). Misconfiguration
 * otherwise shows up much later as confusing runtime errors (read-only filesystem on upload,
 * prepared-statement errors behind PgBouncer, sessions signed with a placeholder secret).
 *
 * Pure: takes the environment as an argument so it can be unit-tested.
 */
export type ConfigReport = { errors: string[]; warnings: string[] };

type Env = Record<string, string | undefined>;

const PLACEHOLDER_SECRETS = new Set(["replace-me", "changeme", "change-me", "secret"]);

export function checkProductionConfig(env: Env): ConfigReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const onVercel = !!env.VERCEL;

  // Auth
  const secret = env.AUTH_SECRET ?? "";
  if (!secret) errors.push("AUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  else if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) errors.push("AUTH_SECRET is still the placeholder value from .env.example.");
  else if (secret.length < 32) errors.push("AUTH_SECRET is too short (use at least 32 characters, e.g. openssl rand -base64 32).");
  if (!onVercel && env.AUTH_TRUST_HOST !== "true" && !env.AUTH_URL) {
    errors.push("Self-hosted: set AUTH_TRUST_HOST=true (behind a trusted proxy) or AUTH_URL, otherwise every login fails with UntrustedHost.");
  }

  // Database
  const db = env.DATABASE_URL ?? "";
  if (!db) errors.push("DATABASE_URL is not set.");
  else {
    try {
      const u = new URL(db);
      if (u.port === "6543" && u.searchParams.get("pgbouncer") !== "true") {
        warnings.push("DATABASE_URL uses port 6543 (Supabase transaction pooler) without ?pgbouncer=true; Prisma will hit prepared-statement errors.");
      }
      if (onVercel && ["localhost", "127.0.0.1"].includes(u.hostname)) errors.push("DATABASE_URL points at localhost, which doesn't exist on Vercel.");
    } catch {
      errors.push("DATABASE_URL is not a valid URL.");
    }
  }

  // Images
  const driver = env.STORAGE_DRIVER ?? "local";
  if (driver === "cloudinary") {
    const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter((k) => !env[k]);
    if (missing.length) errors.push(`STORAGE_DRIVER=cloudinary but ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`);
  } else if (driver === "local") {
    if (onVercel) errors.push("STORAGE_DRIVER is 'local' (the default), but Vercel has no persistent disk. Set STORAGE_DRIVER=cloudinary.");
  } else {
    errors.push(`STORAGE_DRIVER must be 'local' or 'cloudinary' (got '${driver}').`);
  }

  // Public URL
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (!site) {
    warnings.push(
      onVercel
        ? "NEXT_PUBLIC_SITE_URL is not set; falling back to the Vercel production domain for canonical URLs and the sitemap."
        : "NEXT_PUBLIC_SITE_URL is not set; canonical URLs and the sitemap will point at localhost.",
    );
  } else if (onVercel && !site.startsWith("https://")) {
    warnings.push(`NEXT_PUBLIC_SITE_URL should be an https:// origin (got ${site}).`);
  }

  return { errors, warnings };
}
