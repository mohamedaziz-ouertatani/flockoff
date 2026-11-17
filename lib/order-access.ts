import "server-only";
import { cookies } from "next/headers";

/**
 * Short codes (FO-7K2Q) are guessable, so the confirmation page only reveals personal details
 * (name, phone, address) to the browser that placed the order, the owning account, or an admin.
 * The browser proof is an httpOnly cookie holding the unguessable order *ids* it created.
 */
const COOKIE = "fo_orders";
const MAX_REMEMBERED = 10;

export async function rememberOrder(orderId: string) {
  const jar = await cookies();
  const existing = (jar.get(COOKIE)?.value ?? "").split(".").filter(Boolean);
  const next = [orderId, ...existing.filter((id) => id !== orderId)].slice(0, MAX_REMEMBERED);
  jar.set(COOKIE, next.join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function browserPlacedOrder(orderId: string) {
  const jar = await cookies();
  return (jar.get(COOKIE)?.value ?? "").split(".").includes(orderId);
}
