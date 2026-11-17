import type { Metadata } from "next";
import { auth } from "@/auth";
import { getCheckoutDefaults } from "@/lib/services/users";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

const EMPTY = { firstName: "", lastName: "", email: "", phone: "", street: "", city: "", zip: "" };

export default async function CheckoutPage() {
  const session = await auth();
  const defaults = session?.user?.id ? await getCheckoutDefaults(session.user.id) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-5xl tracking-wide uppercase sm:text-6xl">Checkout</h1>
      <CheckoutForm defaults={defaults ?? EMPTY} isGuest={!session?.user} />
    </div>
  );
}
