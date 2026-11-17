"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { clientIp, hit, humanizeWait, LIMITS } from "@/lib/services/rate-limit";
import { z } from "zod";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { EmailTakenError, registerCustomer } from "@/lib/services/accounts";
import { signupSchema, type SignupField } from "@/lib/validation/auth";

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<Record<SignupField, string>>;
  /** Echoed back (never the passwords) so fields survive React 19's post-action form reset. */
  values?: { firstName: string; lastName: string; email: string; phone: string };
};

const str = (v: FormDataEntryValue | null, max = 254) => (typeof v === "string" ? v.slice(0, max) : "");

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values = {
    firstName: str(formData.get("firstName"), 60),
    lastName: str(formData.get("lastName"), 60),
    email: str(formData.get("email")),
    phone: str(formData.get("phone"), 30),
  };
  const parsed = signupSchema.safeParse({
    ...values,
    password: str(formData.get("password"), 500),
    confirmPassword: str(formData.get("confirmPassword"), 500),
  });
  if (!parsed.success) {
    const fe = z.flattenError(parsed.error).fieldErrors as Partial<Record<SignupField, string[]>>;
    return {
      values,
      fieldErrors: Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])) as SignupState["fieldErrors"],
    };
  }

  // Counted only for valid submissions, so typos don't use up the allowance.
  const limit = await hit(LIMITS.signupPerIp, clientIp(await headers()));
  if (!limit.allowed) {
    return { values, error: `Too many new accounts from this network. Please try again in ${humanizeWait(limit.retryAfterMs)}.` };
  }

  try {
    await registerCustomer(parsed.data);
  } catch (e) {
    if (e instanceof EmailTakenError) {
      return { values, fieldErrors: { email: "An account with this email already exists. Log in instead." } };
    }
    console.error("signup failed", e);
    return { values, error: "Couldn't create your account. Please try again." };
  }

  // Signed in straight away; the account exists even if this step fails.
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: await safeCallbackUrl(formData.get("callbackUrl"), "/account"),
    });
  } catch (err) {
    if (err instanceof AuthError) return { values, error: "Account created. Please log in." };
    throw err; // NEXT_REDIRECT must propagate
  }
  return {};
}
