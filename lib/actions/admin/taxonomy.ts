"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTaxonomy, deleteTaxonomy, updateTaxonomy } from "@/lib/services/admin/taxonomy";
import { idSchema, taxonomyInputSchema } from "@/lib/validation/admin";
import { AdminError, assertAdmin, fail, toFieldErrors, type ActionResult } from "./result";

const kindSchema = z.enum(["category", "collection"]);

function parse(input: unknown) {
  const r = taxonomyInputSchema.safeParse(input);
  if (!r.success) throw new AdminError("Please fix the highlighted fields.", toFieldErrors(z.flattenError(r.error).fieldErrors));
  return r.data;
}

function refresh() {
  revalidatePath("/admin/catalog");
  revalidatePath("/", "layout"); // header nav lists collections
}

export async function createTaxonomyAction(kind: unknown, input: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await createTaxonomy(kindSchema.parse(kind), parse(input));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTaxonomyAction(kind: unknown, id: unknown, input: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await updateTaxonomy(kindSchema.parse(kind), idSchema.parse(id), parse(input));
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTaxonomyAction(kind: unknown, id: unknown): Promise<ActionResult<{ unassigned: number }>> {
  try {
    await assertAdmin();
    const result = await deleteTaxonomy(kindSchema.parse(kind), idSchema.parse(id));
    refresh();
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}
