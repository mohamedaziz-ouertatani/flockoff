import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { formatTunisianPhone } from "@/lib/phone";
import { getCustomer } from "@/lib/services/admin/customers";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage({ params }: { params: Promise<{ key: string }> }) {
  const customer = await getCustomer((await params).key.slice(0, 40));
  if (!customer) notFound();

  return (
    <>
      <Link href="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Customers
      </Link>
      <PageHeader
        title={customer.name}
        description={customer.accountSince ? `Account since ${formatDate(customer.accountSince)}` : "Guest customer (no account)"}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone (latest)</dt>
              <dd>
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {formatTunisianPhone(customer.phone)}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address (latest)</dt>
              <dd>
                {customer.address.street}, {customer.address.zip} {customer.address.city}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <dt className="text-muted-foreground">Orders</dt>
                <dd className="text-xl font-semibold tabular-nums">{customer.orderCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total spent</dt>
                <dd className="text-xl font-semibold tabular-nums">{formatTND(customer.totalSpent)}</dd>
              </div>
            </div>
          </dl>
        </Panel>
        <Panel className="p-0">
          <h2 className="px-5 pt-5 pb-3 text-sm font-medium">Orders</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Order</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-5">
                    <Link href={`/admin/orders/${o.shortCode}`} className="font-mono font-medium hover:underline">
                      {o.shortCode}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatTND(o.total)}</TableCell>
                  <TableCell className="pr-5">
                    <StatusBadge status={o.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
