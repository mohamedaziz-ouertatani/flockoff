import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/shop/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { countOrdersByStatus, listOrders } from "@/lib/services/admin/orders";
import { cn } from "@/lib/utils";
import { orderStatusSchema } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Orders" };

type SP = { status?: string; q?: string; page?: string };

function href(sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch };
  const p = new URLSearchParams();
  if (next.status) p.set("status", next.status);
  if (next.q) p.set("q", next.q);
  if (next.page && next.page !== "1") p.set("page", next.page);
  const s = p.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = orderStatusSchema.safeParse(sp.status).data;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(sp.page ?? "1", 10) || 1));
  const clean: SP = { status, q: q || undefined };

  const [{ rows, total, pageCount }, counts] = await Promise.all([listOrders({ status, q, page }), countOrdersByStatus()]);
  const all = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <>
      <PageHeader title="Orders" description={`${total} ${total === 1 ? "order" : "orders"}${status ? ` · ${STATUS_LABEL[status]}` : ""}${q ? ` matching “${q}”` : ""}`} />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1">
        {[undefined, ...ORDER_STATUSES].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? "all"}
              href={href(clean, { status: s, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent",
              )}
            >
              {s ? STATUS_LABEL[s] : "All"}
              <span className={cn("ml-1.5 tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>
                {s ? (counts[s] ?? 0) : all}
              </span>
            </Link>
          );
        })}
      </nav>

      <form role="search" className="mb-4 flex max-w-md items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Code, name, email or phone" className="h-10 bg-background pl-9" aria-label="Search orders" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Order date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No orders {status || q ? "match these filters" : "yet"}.
                </TableCell>
              </TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/admin/orders/${o.shortCode}`} className="font-mono font-medium hover:underline hover:underline-offset-4">
                    {o.shortCode}
                  </Link>
                </TableCell>
                {/* The old site showed IDs here; this column is the order's date. */}
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {o.firstName} {o.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.email}
                    {!o.userId && " · guest"}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{o.itemCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatTND(o.total)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => href(clean, { page: String(p) })} />
    </>
  );
}
