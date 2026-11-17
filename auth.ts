import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { attemptLogin } from "@/lib/services/auth";
import { clientIp } from "@/lib/services/rate-limit";
import { readCookie, TRUSTED_DEVICE_COOKIE } from "@/lib/services/trusted-device";
import { setTrustedDeviceCookie } from "@/lib/trusted-device-cookie";
import { loginSchema } from "@/lib/validation/auth";

/** Thrown from authorize so the login form can say "too many attempts" instead of "wrong password". */
export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
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
        await setTrustedDeviceCookie(result.deviceToken);
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
