import { auth } from "@/auth";
import { AdminError } from "@/lib/services/admin/errors";

export { AdminError };

/** Uniform result for admin mutations. Field errors are shown inline next to their inputs. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

/** Every admin server action starts here: actions are POST endpoints, middleware doesn't cover them. */
export async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new AdminError("You are not authorised to do this.");
  return session;
}

export function toFieldErrors(flat: Record<string, string[] | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(flat)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => [k, v![0]]),
  );
}

export function fail(e: unknown): { ok: false; error?: string; fieldErrors?: Record<string, string> } {
  if (e instanceof AdminError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
  console.error("admin action failed", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}
