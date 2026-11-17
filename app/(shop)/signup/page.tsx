import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/account");
  const { callbackUrl } = await searchParams;
  const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="font-display text-4xl tracking-wide uppercase">Create an account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track your orders in one place. You can still check out as a guest any time.
        </p>
      </div>
      <SignupForm callbackUrl={callbackUrl ?? "/account"} />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
