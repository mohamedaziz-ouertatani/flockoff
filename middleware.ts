import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: only uses the JWT, never touches the database.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*"],
};
