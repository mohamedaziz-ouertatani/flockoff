import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderTotals } from "@/components/shop/order-summary";
import { formatDateTime } from "@/lib/format";
import { formatTND } from "@/lib/money";
import { formatTunisianPhone } from "@/lib/phone";
import { getAdminOrder } from "@/lib/services/admin/orders";

type Props = { params: Promise<{ shortCode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${decodeURIComponent((await params).shortCode)}` };
}

export default async function AdminOrderPage({ params }: Props) {
  const shortCode = decodeURIComponent((await params).shortCode).toUpperCase().slice(0, 12);
  const order = await getAdminOrder(shortCode);
  if (!order) notFound();

  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← Orders
      </Link>
      <PageHeader
        title={`Order ${order.shortCode}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} /> Placed {formatDateTime(order.createdAt)} · Cash on delivery
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-3 text-sm font-medium">Items</h2>
            <ul className="divide-y border-y">
              {order.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                  <div>
                    {i.variant ? (
                      <Link href={`/admin/products/${i.variant.product.id}`} className="font-medium hover:underline hover:underline-offset-4">
                        {i.productName}
                      </Link>
                    ) : (
                      <span className="font-medium">{i.productName}</span>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · Size {i.size} · {i.quantity} × {formatTND(i.unitPrice)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {i.variant ? `${i.variant.stock} currently in stock` : "Size or product has since been deleted"}
                    </div>
                  </div>
                  <span className="tabular-nums">{formatTND(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals
              className="mt-4 ml-auto max-w-xs"
              totals={{ itemCount, subtotal: order.subtotal, shippingFee: order.shippingFee, total: order.total }}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="mb-3 text-sm font-medium">Fulfilment</h2>
            <OrderActions orderId={order.id} status={order.status} />
          </Panel>
          <Panel>
            <h2 className="mb-3 text-sm font-medium">Customer</h2>
            <p className="text-sm font-medium">
              {order.firstName} {order.lastName}
            </p>
            <p className="text-sm">
              <a href={`tel:${order.phone}`} className="hover:underline">
                {formatTunisianPhone(order.phone)}
              </a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${order.email}`} className="break-all hover:underline">
                {order.email}
              </a>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{order.userId ? "Registered account" : "Guest checkout"}</p>
            <h2 className="mt-5 mb-2 text-sm font-medium">Delivery address</h2>
            <address className="text-sm leading-relaxed text-muted-foreground not-italic">
              {order.street}
              <br />
              {order.zip} {order.city}
              <br />
              {order.country}
            </address>
          </Panel>
        </div>
      </div>
    </>
  );
}
