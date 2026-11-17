// Dates are stored in UTC and always shown in Tunis time, so admins see the same day customers do.
const TZ = "Africa/Tunis";

/** "17 Nov 2026, 14:05" */
export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** "17 Nov 2026" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

/** "Hoodie – Black" -> "hoodie-black". Accents are folded so slugs stay ASCII. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
