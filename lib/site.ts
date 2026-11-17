/**
 * Canonical site origin for absolute URLs (Open Graph, sitemap, JSON-LD).
 * Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is the fallback.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

export const SITE_NAME = "FLOCK OFF";
export const SITE_DESCRIPTION =
  "Independent streetwear from Tunis. Hoodies, tees, jerseys and pants. Cash on delivery across Tunisia.";

/** Social platforms don't render SVG previews, so our generated placeholders are skipped. */
export function isShareableImage(url: string | null | undefined): url is string {
  return !!url && !url.startsWith("/placeholder/");
}
