import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  // Already logged in: an admin bounced here from /admin is the exception (they lack access).
  if (session?.user && !callbackUrl) redirect("/account");
  const signupHref = callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup";

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-20">
      <h1 className="font-display text-4xl tracking-wide uppercase">Log in</h1>
      <LoginForm callbackUrl={callbackUrl ?? "/account"} />
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href={signupHref} className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
