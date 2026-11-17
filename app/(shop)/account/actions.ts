"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { changePassword } from "@/lib/services/accounts";
import { humanizeWait } from "@/lib/services/rate-limit";
import { setTrustedDeviceCookie } from "@/lib/trusted-device-cookie";
import { changePasswordSchema, type ChangePasswordField } from "@/lib/validation/auth";

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<ChangePasswordField, string>>;
};

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.slice(0, 500) : "");

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Your session has expired. Please log in again." };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: str(formData.get("currentPassword")),
    newPassword: str(formData.get("newPassword")),
    confirmPassword: str(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    const fe = z.flattenError(parsed.error).fieldErrors as Partial<Record<ChangePasswordField, string[]>>;
    return { fieldErrors: Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])) };
  }

  const result = await changePassword(session.user.id, parsed.data);
  switch (result.status) {
    case "ok":
      await setTrustedDeviceCookie(result.deviceToken);
      return { ok: true };
    case "wrong_password":
      return { fieldErrors: { currentPassword: "That isn't your current password." } };
    case "rate_limited":
      return { error: `Too many attempts. Please try again in ${humanizeWait(result.retryAfterMs)}.` };
    case "conflict":
      return { error: "Your password was just changed somewhere else. Reload the page and try again." };
    case "not_found":
      return { error: "Your session has expired. Please log in again." };
  }
}
