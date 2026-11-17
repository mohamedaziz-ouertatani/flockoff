"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string[]>>;
  /** Echoed back so the field survives React 19's post-action form reset. */
  email?: string;
};

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
