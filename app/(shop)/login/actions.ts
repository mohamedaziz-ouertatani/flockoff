"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string[]>>;
  /** Echoed back so the field survives React 19's post-action form reset. */
  email?: string;
};

/**
 * Auth.js passes callbackUrl as an absolute URL (http://host/admin). Accept it only if it
 * points at this host, and reduce it to a path — anything else falls back to "/" so the
 * login form can't be used as an open redirect.
 */
async function safeCallbackUrl(value: FormDataEntryValue | null): Promise<string> {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  const host = (await headers()).get("host");
  try {
    const url = new URL(raw, `http://${host ?? "localhost"}`);
    if (url.host !== host) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.slice(0, 254) : "";
  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { email, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: await safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { email, error: "Invalid email or password." };
    }
    throw err; // NEXT_REDIRECT must propagate
  }
  return {};
}
