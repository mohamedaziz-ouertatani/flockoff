import { z } from "zod";
import { normalizeTunisianPhone } from "@/lib/phone";

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")).pipe(z.string().max(254));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt ignores everything past 72 bytes, so longer passwords would be silently truncated. */
export const MAX_PASSWORD_BYTES = 72;

const name = (label: string) => z.string().trim().min(1, `${label} is required`).max(60, `${label} is too long`);

export const signupSchema = z
  .object({
    firstName: name("First name"),
    lastName: name("Last name"),
    email: emailField,
    // Optional at sign-up; when given it must be a valid Tunisian number (prefills checkout).
    phone: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const n = normalizeTunisianPhone(v);
        if (!n) {
          ctx.addIssue({ code: "custom", message: "Enter a Tunisian number, e.g. +216 22 123 456" });
          return z.NEVER;
        }
        return n;
      }),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .refine((p) => new TextEncoder().encode(p).length <= MAX_PASSWORD_BYTES, "That password is too long (max 72 bytes)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export type SignupInput = z.input<typeof signupSchema>;
export type SignupData = z.output<typeof signupSchema>;
export type SignupField = keyof SignupInput;
