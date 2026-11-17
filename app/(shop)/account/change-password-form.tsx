"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, type ChangePasswordField } from "@/lib/validation/auth";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const FIELDS: { name: ChangePasswordField; label: string; autoComplete: string; hint?: string }[] = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password", hint: `At least ${MIN_PASSWORD_LENGTH} characters` },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
];

/** Passwords are never echoed back, so React 19's post-action reset clears the fields as intended. */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4 border p-5">
      {FIELDS.map((f) => {
        const id = `pw-${f.name}`;
        const err = state.fieldErrors?.[f.name];
        const describedBy = [f.hint && !err && `${id}-hint`, err && `${id}-error`].filter(Boolean).join(" ") || undefined;
        return (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{f.label}</Label>
            <Input
              id={id}
              name={f.name}
              type="password"
              autoComplete={f.autoComplete}
              aria-invalid={!!err}
              aria-describedby={describedBy}
              className="h-10"
            />
            {f.hint && !err && (
              <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                {f.hint}
              </p>
            )}
            {err && (
              <p id={`${id}-error`} className="text-sm text-destructive">
                {err}
              </p>
            )}
          </div>
        );
      })}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-emerald-700">
          Password changed. Other browsers that were remembered for this account will need the new password.
        </p>
      )}
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
