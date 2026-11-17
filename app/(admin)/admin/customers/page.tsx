import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/shop/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { formatTunisianPhone } from "@/lib/phone";
import { listCustomers } from "@/lib/services/admin/customers";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(sp.page ?? "1", 10) || 1));
  const { customers, total, pageCount } = await listCustomers({ q, page });

  const pageHref = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (p > 1) s.set("page", String(p));
    const qs = s.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} ${total === 1 ? "customer" : "customers"} who have ordered, grouped by email. Total spent excludes cancelled orders.`}
      />
      <form role="search" className="mb-4 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Name, email or phone" className="h-10 bg-background pl-9" aria-label="Search customers" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total spent</TableHead>
              <TableHead>Last order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {q ? "No customers match that search." : "No customers yet. They appear here after their first order."}
                </TableCell>
              </TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.key}>
                <TableCell>
                  <Link href={`/admin/customers/${c.key}`} className="font-medium hover:underline hover:underline-offset-4">
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {c.email} · {c.hasAccount ? "account" : "guest"}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatTunisianPhone(c.phone)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatTND(c.totalSpent)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(c.lastOrder)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={pageHref} />
    </>
  );
}
