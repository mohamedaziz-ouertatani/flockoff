"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, type SignupField } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import { signupAction, type SignupState } from "./actions";

const FIELDS: {
  name: SignupField;
  label: string;
  type?: string;
  autoComplete: string;
  hint?: string;
  span?: boolean;
  inputMode?: "tel" | "email";
}[] = [
  { name: "firstName", label: "First name", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", autoComplete: "family-name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email", span: true },
  { name: "phone", label: "Phone (optional)", type: "tel", autoComplete: "tel", inputMode: "tel", hint: "Saves typing at checkout. +216 22 123 456", span: true },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: `At least ${MIN_PASSWORD_LENGTH} characters`, span: true },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password", span: true },
];

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signupAction, {});

  return (
    <form action={formAction} noValidate className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {FIELDS.map((f) => {
        const id = `signup-${f.name}`;
        const err = state.fieldErrors?.[f.name];
        const describedBy = [f.hint && `${id}-hint`, err && `${id}-error`].filter(Boolean).join(" ") || undefined;
        const isPassword = f.name === "password" || f.name === "confirmPassword";
        return (
          <div key={f.name} className={cn("flex flex-col gap-1.5", f.span && "sm:col-span-2")}>
            <Label htmlFor={id}>{f.label}</Label>
            <Input
              id={id}
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              // Passwords are never echoed back from the server.
              defaultValue={isPassword ? undefined : (state.values?.[f.name as keyof NonNullable<SignupState["values"]>] ?? "")}
              aria-invalid={!!err}
              aria-describedby={describedBy}
              className="h-11"
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
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} size="lg" className="h-12 text-sm tracking-widest uppercase sm:col-span-2">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
