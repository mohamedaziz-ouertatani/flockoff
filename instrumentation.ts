/**
 * Runs once when a server instance starts (not during `next build`). In production, refuse to
 * start with a broken configuration and say exactly what to fix, instead of failing later.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { checkProductionConfig } = await import("@/lib/config-check");
  const { errors, warnings } = checkProductionConfig(process.env);
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`[config] ${e}`);
    throw new Error(`FLOCK OFF configuration is invalid (${errors.length} problem${errors.length === 1 ? "" : "s"}); see the [config] lines above.`);
  }
}
