import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { formatTunisianPhone } from "@/lib/phone";
import { getAccount, listAccountOrders } from "@/lib/services/accounts";
import { cn } from "@/lib/utils";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

// Customer-facing wording (the admin uses "Pending" for the same state).
const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Received", cls: "bg-amber-100 text-amber-900" },
  CONFIRMED: { label: "Confirmed", cls: "bg-sky-100 text-sky-900" },
  SHIPPED: { label: "On its way", cls: "bg-violet-100 text-violet-900" },
  DELIVERED: { label: "Delivered", cls: "bg-emerald-100 text-emerald-900" },
  CANCELLED: { label: "Cancelled", cls: "bg-neutral-200 text-neutral-600" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const [account, orders] = await Promise.all([getAccount(session.user.id), listAccountOrders(session.user.id)]);
  // A valid session for a deleted user: treat as logged out.
  if (!account) redirect("/login?callbackUrl=/account");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Your account</p>
          <h1 className="font-display text-5xl tracking-wide uppercase">Hi, {account.firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {account.role === "ADMIN" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Admin panel</Link>
            </Button>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-4 text-[11px] font-semibold tracking-widest uppercase">
            Order history
          </h2>
          {orders.length === 0 ? (
            <div className="flex flex-col items-start gap-4 border border-dashed p-8">
              <p className="font-display text-2xl tracking-wide uppercase">No orders yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Orders you place while logged in will show up here. Orders placed as a guest before you created your account
                aren&apos;t linked to it.
              </p>
              <Button asChild>
                <Link href="/shop">Start shopping</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y border-y">
              {orders.map((o) => {
                const s = STATUS[o.status];
                const summary = o.items.map((i) => `${i.productName} (${i.size})${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");
                return (
                  <li key={o.id}>
                    <Link href={`/order/${o.shortCode}`} className="group flex items-center gap-4 py-4 hover:bg-accent/50 sm:px-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-sm font-medium">{o.shortCode}</span>
                          <span className={cn("rounded-sm px-1.5 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatTND(o.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside aria-labelledby="details-heading" className="lg:pt-0">
          <h2 id="details-heading" className="mb-4 text-[11px] font-semibold tracking-widest uppercase">
            Details
          </h2>
          <dl className="flex flex-col gap-3 border p-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>
                {account.firstName} {account.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{account.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{account.phone ? formatTunisianPhone(account.phone) : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd>{formatDate(account.createdAt)}</dd>
            </div>
          </dl>

          <h2 id="password-heading" className="mt-10 mb-4 text-[11px] font-semibold tracking-widest uppercase">
            Password
          </h2>
          <ChangePasswordForm justChanged={password === "changed"} />
        </aside>
      </div>
    </div>
  );
}
