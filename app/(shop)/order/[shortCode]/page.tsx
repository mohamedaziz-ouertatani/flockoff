import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";
import { auth } from "@/auth";
import { OrderTotals } from "@/components/shop/order-summary";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/money";
import { browserPlacedOrder } from "@/lib/order-access";
import { formatTunisianPhone } from "@/lib/phone";
import { getOrderAccessInfo, getOrderDetails } from "@/lib/services/orders";

type Props = { params: Promise<{ shortCode: string }> };

const SHORT_CODE = /^FO-[2-9A-HJ-NP-Z]{4,6}$/;

const STATUS_LABEL = {
  PENDING: "Received",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default async function OrderPage({ params }: Props) {
  const shortCode = decodeURIComponent((await params).shortCode).toUpperCase();
  if (!SHORT_CODE.test(shortCode)) notFound();

  // Access check first, using a query with no personal data in it.
  const access = await getOrderAccessInfo(shortCode);
  if (!access) notFound();

  const session = await auth();
  const canSeeDetails =
    session?.user?.role === "ADMIN" ||
    (!!access.userId && access.userId === session?.user?.id) ||
    (await browserPlacedOrder(access.id));

  if (!canSeeDetails) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Order {access.shortCode}</p>
        <h1 className="font-display text-5xl tracking-wide uppercase">{STATUS_LABEL[access.status]}</h1>
        <p className="text-muted-foreground">
          For privacy, order details are only shown on the device that placed the order or to the account it belongs to.
        </p>
        <Button asChild variant="outline">
          <Link href={`/login?callbackUrl=/order/${access.shortCode}`}>Log in</Link>
        </Button>
      </div>
    );
  }

  const order = await getOrderDetails(access.id);
  if (!order) notFound();
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex flex-col items-start gap-3">
        <CheckCircle2Icon className="size-10 text-brand" aria-hidden />
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Order {order.shortCode} · {STATUS_LABEL[order.status]}
        </p>
        <h1 className="font-display text-5xl leading-none tracking-wide uppercase sm:text-6xl">
          {order.status === "CANCELLED" ? "Order cancelled" : `Thanks, ${order.firstName}`}
        </h1>
        {order.status !== "CANCELLED" && (
          <p className="max-w-lg text-muted-foreground">
            We&apos;ve received your order and will call you on {formatTunisianPhone(order.phone)} to confirm delivery.
            Have <span className="font-medium text-foreground">{formatTND(order.total)}</span> ready in cash for the courier.
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-8 border-t pt-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[11px] font-semibold tracking-widest uppercase">Delivery to</h2>
          <address className="text-sm leading-relaxed text-muted-foreground not-italic">
            {order.firstName} {order.lastName}
            <br />
            {order.street}
            <br />
            {order.zip} {order.city}, {order.country}
            <br />
            {formatTunisianPhone(order.phone)}
            <br />
            {order.email}
          </address>
        </div>
        <div>
          <h2 className="mb-2 text-[11px] font-semibold tracking-widest uppercase">Payment</h2>
          <p className="text-sm text-muted-foreground">Cash on delivery</p>
          <h2 className="mt-5 mb-2 text-[11px] font-semibold tracking-widest uppercase">Placed</h2>
          <p className="text-sm text-muted-foreground">
            {order.createdAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Tunis" })}
          </p>
        </div>
      </div>

      <div className="mt-10 border-t pt-8">
        <h2 className="mb-4 text-[11px] font-semibold tracking-widest uppercase">Items</h2>
        <ul className="divide-y border-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                <span className="font-medium">{i.productName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · Size {i.size} · {i.quantity} × {formatTND(i.unitPrice)}
                </span>
              </span>
              <span className="tabular-nums">{formatTND(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <OrderTotals
          className="mt-4 ml-auto max-w-xs"
          totals={{ itemCount, subtotal: order.subtotal, shippingFee: order.shippingFee, total: order.total }}
        />
      </div>

      <div className="mt-12">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
