import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { attemptLogin } from "@/lib/services/auth";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/services/rate-limit";
import { readCookie, TRUSTED_DEVICE_COOKIE, TRUSTED_DEVICE_TTL_MS } from "@/lib/services/trusted-device";
import { loginSchema } from "@/lib/validation/auth";

/** Thrown from authorize so the login form can say "too many attempts" instead of "wrong password". */
export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Marks this browser as a trusted device (see lib/services/trusted-device.ts). Works in the
 * server-action and route-handler contexts authorize runs in; if cookies can't be set, the login
 * still succeeds, the device just isn't remembered.
 */
async function rememberDevice(token: string) {
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Rate limiting lives here (not only in the login form) because Auth.js also exposes
      // POST /api/auth/callback/credentials, which can be called directly.
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const deviceToken = readCookie(request.headers.get("cookie"), TRUSTED_DEVICE_COOKIE);
        const result = await attemptLogin(parsed.data, clientIp(request.headers), { deviceToken });
        if (result.status === "rate_limited") throw new RateLimitedSignin();
        if (result.status !== "ok") return null;
        if (result.deviceToken) await rememberDevice(result.deviceToken);
        return result.user;
      },
    }),
  ],
});

/** Server-side guard for admin pages and actions (defense in depth beyond middleware). */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
