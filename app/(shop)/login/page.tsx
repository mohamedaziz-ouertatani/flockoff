import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-20">
      <h1 className="font-display text-4xl tracking-wide uppercase">Log in</h1>
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </div>
  );
}
