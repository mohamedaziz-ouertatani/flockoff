import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validation/auth";
import { verifyCredentials } from "@/lib/services/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        return verifyCredentials(parsed.data);
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
