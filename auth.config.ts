import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / bcrypt) — shared by middleware and auth.ts.
 * Providers that need Node APIs are added in auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname.startsWith("/admin")) {
        if (!auth?.user) return false; // -> redirect to /login?callbackUrl=...
        if (auth.user.role !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
