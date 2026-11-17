import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates /admin; this re-checks on the server in case of matcher drift.
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-bold tracking-tight">FLOCK OFF · Admin</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <span className="mr-4 text-sm text-neutral-500">{session.user.email}</span>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
