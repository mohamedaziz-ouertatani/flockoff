import "server-only";
import { cookies } from "next/headers";
import { TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_TTL_MS } from "@/lib/services/trusted-device";

/**
 * Stores a trusted-device token in this browser (see lib/services/trusted-device.ts). Works in the
 * server-action and route-handler contexts it's called from; if the cookie can't be set, the
 * caller's operation still succeeds, the device just isn't remembered.
 */
export async function setTrustedDeviceCookie(token: string | null) {
  if (!token) return;
  try {
    (await cookies()).set(TRUSTED_DEVICE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(TRUSTED_DEVICE_TTL_MS / 1000),
    });
  } catch (e) {
    console.warn("could not set trusted-device cookie", e);
  }
}
