import type { DefaultSession } from "next-auth";

type AppRole = "CUSTOMER" | "ADMIN";

declare module "next-auth" {
  interface User {
    role: AppRole;
    sessionVersion?: number;
  }
  interface Session {
    user: { id: string; role: AppRole } & DefaultSession["user"];
  }
}

// next-auth/jwt only re-exports this module, so augment the source declaration.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    /** User.sessionVersion at login; missing on tokens issued before it existed (treated as 0). */
    sv?: number;
  }
}
