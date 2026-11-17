"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";
import { LoaderIcon } from "lucide-react";
import { CartNotes } from "@/components/shop/cart-notes";
import { OrderTotals } from "@/components/shop/order-summary";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getCartSnapshot } from "@/lib/actions/cart";
import { placeOrder } from "@/lib/actions/checkout";
import { useCart } from "@/lib/cart/store";
import { useCartSync } from "@/lib/cart/use-cart-sync";
import { formatTND } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { checkoutContactSchema, type CheckoutField } from "@/lib/validation/checkout";

type Contact = Record<CheckoutField, string>;
type FieldErrors = Partial<Record<CheckoutField, string>>;

const FIELDS: { name: CheckoutField; label: string; type?: string; autoComplete: string; inputMode?: "tel" | "numeric" | "email"; placeholder?: string; span?: boolean }[] = [
  { name: "firstName", label: "First name", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", autoComplete: "family-name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email", span: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+216 22 123 456", span: true },
  { name: "street", label: "Street address", autoComplete: "street-address", span: true },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "zip", label: "Postal code", autoComplete: "postal-code", inputMode: "numeric", placeholder: "1000" },
];

function validateField(name: CheckoutField, value: string): string | undefined {
  const r = checkoutContactSchema.shape[name].safeParse(value);
  return r.success ? undefined : r.error.issues[0]?.message;
}

export function CheckoutForm({ defaults, isGuest }: { defaults: Contact; isGuest: boolean }) {
  const router = useRouter();
  const { hydrated, synced, notes, setNotes } = useCartSync();
  const lines = useCart((s) => s.lines);
  const [values, setValues] = useState<Contact>(defaults);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!hydrated || placed) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {placed && <p className="text-sm text-muted-foreground">Order placed. Taking you to your confirmation…</p>}
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <CartNotes notes={notes} />
        <div className="flex flex-col items-start gap-4 border border-dashed p-10">
          <p className="font-display text-3xl tracking-wide uppercase">Nothing to check out</p>
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button asChild>
            <Link href="/shop">Shop all</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totals = computeTotals(lines);

  function onChange(name: CheckoutField, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    // Re-validate as they type only once a field has shown an error; otherwise wait for blur.
    if (errors[name]) setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  }

  async function refreshCart(message: string) {
    const snapshots = await getCartSnapshot(useCart.getState().lines.map((l) => l.variantId));
    const changes = useCart.getState().reconcile(snapshots);
    setNotes(changes);
    setFormError(message);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const local = checkoutContactSchema.safeParse(values);
    if (!local.success) {
      const fe = z.flattenError(local.error).fieldErrors as Partial<Record<CheckoutField, string[]>>;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])) as FieldErrors);
      const first = FIELDS.find((f) => fe[f.name]);
      if (first) document.getElementById(`checkout-${first.name}`)?.focus();
      return;
    }

    startTransition(async () => {
      const result = await placeOrder({
        ...values,
        items: useCart.getState().lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        expectedTotal: computeTotals(useCart.getState().lines).total,
      });
      if (result.ok) {
        setPlaced(true);
        useCart.getState().clear();
        router.replace(`/order/${result.shortCode}`);
        return;
      }
      if (result.kind === "invalid") {
        setErrors(Object.fromEntries(Object.entries(result.fieldErrors).map(([k, v]) => [k, v?.[0]])) as FieldErrors);
        setFormError(result.formError ?? "Please fix the highlighted fields.");
      } else if (result.kind === "cart") {
        await refreshCart(`${result.message} Your cart has been updated, review it and place the order again.`);
      } else {
        setFormError(result.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="flex flex-col gap-8">
        <CartNotes notes={notes} onDismiss={() => setNotes([])} />

        {isGuest && (
          <p className="text-sm text-muted-foreground">
            Checking out as a guest.{" "}
            <Link href="/login?callbackUrl=/checkout" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </Link>{" "}
            to link this order to your account.
          </p>
        )}

        <fieldset className="grid gap-x-4 gap-y-5 sm:grid-cols-2" disabled={pending}>
          <legend className="mb-4 text-[11px] font-semibold tracking-widest uppercase">Contact &amp; delivery</legend>
          {FIELDS.map((f) => {
            const id = `checkout-${f.name}`;
            const err = errors[f.name];
            return (
              <div key={f.name} className={cn("flex flex-col gap-1.5", f.span && "sm:col-span-2")}>
                <Label htmlFor={id}>{f.label}</Label>
                <Input
                  id={id}
                  name={f.name}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete}
                  inputMode={f.inputMode}
                  placeholder={f.placeholder}
                  value={values[f.name]}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  onBlur={(e) => setErrors((x) => ({ ...x, [f.name]: validateField(f.name, e.target.value) }))}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${id}-error` : undefined}
                  className="h-11"
                />
                {err && (
                  <p id={`${id}-error`} className="text-sm text-destructive">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>

        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase">Payment</p>
          <div className="flex items-center justify-between border border-foreground p-4">
            <div>
              <p className="font-medium">Cash on delivery</p>
              <p className="text-sm text-muted-foreground">Pay the courier when your order arrives.</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatTND(totals.total)}</span>
          </div>
        </div>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="border bg-card p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold tracking-widest uppercase">Your order</h2>
            <Link href="/cart" className="text-xs underline underline-offset-4">
              Edit cart
            </Link>
          </div>
          <ul className="mb-5 flex flex-col gap-4">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3">
                <div className="relative aspect-[5/6] w-14 shrink-0 overflow-hidden bg-muted">
                  <ProductImage src={l.imageUrl} alt="" fill sizes="56px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col text-sm">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="text-muted-foreground">
                    Size {l.size} · Qty {l.quantity}
                  </span>
                </div>
                <span className="text-sm tabular-nums">{formatTND(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals totals={totals} className="border-t pt-3" />

          {formError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={pending || !synced}
            className="mt-6 h-12 w-full text-sm tracking-widest uppercase"
          >
            {pending ? (
              <>
                <LoaderIcon className="animate-spin" /> Placing order…
              </>
            ) : (
              `Place order · ${formatTND(totals.total)}`
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Stock and prices are confirmed when you place the order.
          </p>
        </div>
      </aside>
    </form>
  );
}
