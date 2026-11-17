import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { getDashboard } from "@/lib/services/admin/dashboard";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Panel>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

export default async function AdminDashboard() {
  const d = await getDashboard();
  const pending = d.byStatus.PENDING ?? 0;

  return (
    <>
      <PageHeader title="Dashboard" description="Revenue excludes cancelled orders. Payment is cash on delivery." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue, last 30 days" value={formatTND(d.revenue.last30)} hint={`${d.revenue.last30Orders} orders`} />
        <Stat label="Revenue, all time" value={formatTND(d.revenue.allTime)} hint={`${d.revenue.allTimeOrders} orders`} />
        <Stat label="Collected (delivered)" value={formatTND(d.revenue.collected)} hint="Cash in hand from delivered orders" />
        <Stat
          label="Awaiting confirmation"
          value={String(pending)}
          hint={pending > 0 ? "Pending orders to call and confirm" : "Nothing waiting"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel className="p-0">
          <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-medium">Latest orders</h2>
            <Link href="/admin/orders" className="text-xs underline underline-offset-4">
              All orders
            </Link>
          </div>
          {d.latest.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y border-t">
              {d.latest.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.shortCode}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-accent">
                    <span className="w-20 font-mono font-medium">{o.shortCode}</span>
                    <span className="min-w-32 flex-1">
                      {o.firstName} {o.lastName}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                    <span className="w-24 text-right tabular-nums">{formatTND(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-3 text-sm font-medium">Orders by status</h2>
            <ul className="flex flex-col gap-1">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <StatusBadge status={s} />
                    <span className="tabular-nums">
                      {d.byStatus[s] ?? 0} <span className="sr-only">{STATUS_LABEL[s]} orders</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
              <AlertTriangleIcon className="size-4 text-amber-600" /> Low stock
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">Sizes with {LOW_STOCK_THRESHOLD} or fewer left</p>
            {d.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything is well stocked.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {d.lowStock.map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/products/${v.product.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:underline">
                      <span className="min-w-0 truncate">
                        {v.product.name} <span className="text-muted-foreground">· {v.size}</span>
                        {!v.product.isActive && <span className="text-xs text-muted-foreground"> (hidden)</span>}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                          v.stock === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900",
                        )}
                      >
                        {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
