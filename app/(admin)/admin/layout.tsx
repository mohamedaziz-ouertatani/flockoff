import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · FLOCK OFF" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /admin; this re-checks on the server in case of matcher drift.
  // Server actions check again themselves (requireAdmin) because they are callable directly.
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Link href="/admin" className="font-display text-xl tracking-wide uppercase">
          Flock Off <span className="text-muted-foreground">Admin</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hidden items-center gap-1 text-muted-foreground hover:text-foreground sm:flex">
            View store <ExternalLinkIcon className="size-3.5" />
          </Link>
          <span className="hidden text-muted-foreground md:inline">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="underline underline-offset-4">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[14rem_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
