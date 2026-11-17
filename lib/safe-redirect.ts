import "server-only";
import { headers } from "next/headers";

/**
 * Turns a user-supplied callbackUrl into a same-site path. Auth.js passes absolute URLs
 * (http://host/admin); we accept them only for this host. Anything else falls back, so auth
 * forms can't be used as open redirects.
 */
export async function safeCallbackUrl(value: FormDataEntryValue | null | undefined, fallback = "/"): Promise<string> {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  const host = (await headers()).get("host");
  try {
    const url = new URL(raw, `http://${host ?? "localhost"}`);
    if (url.host !== host) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
