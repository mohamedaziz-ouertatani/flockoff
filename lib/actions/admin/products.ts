"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  moveProductImage,
  updateProduct,
} from "@/lib/services/admin/products";
import { getStorage, MAX_IMAGE_BYTES, sniffImageKind } from "@/lib/storage";
import { idSchema, productInputSchema } from "@/lib/validation/admin";
import { AdminError, assertAdmin, fail, toFieldErrors, type ActionResult } from "./result";

function parseProduct(input: unknown) {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    throw new AdminError(flat.formErrors[0] ?? "Please fix the highlighted fields.", toFieldErrors(flat.fieldErrors));
  }
  return parsed.data;
}

export async function createProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin();
    const product = await createProduct(parseProduct(input));
    revalidatePath("/admin/products");
    return { ok: true, data: { id: product.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProductAction(id: unknown, input: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    const productId = idSchema.parse(id);
    await updateProduct(productId, parseProduct(input));
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductAction(id: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await deleteProduct(idSchema.parse(id));
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** One file per call (keeps each request under the body size limit). */
export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ id: string; url: string }>> {
  try {
    await assertAdmin();
    const productId = idSchema.parse(formData.get("productId"));
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AdminError("Choose an image to upload.");
    if (file.size > MAX_IMAGE_BYTES) throw new AdminError(`${file.name} is larger than 5 MB.`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImageKind(bytes);
    if (!kind) throw new AdminError(`${file.name} isn't a JPEG, PNG, WebP or AVIF image.`);

    const stored = await getStorage().put(bytes, kind);
    try {
      const image = await addProductImage(productId, stored.url);
      revalidatePath(`/admin/products/${productId}`);
      return { ok: true, data: { id: image.id, url: image.url } };
    } catch (e) {
      await getStorage().delete(stored.url); // don't leave an orphaned file behind
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProductImageAction(imageId: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await deleteProductImage(idSchema.parse(imageId));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveProductImageAction(imageId: unknown, direction: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await moveProductImage(idSchema.parse(imageId), z.enum(["up", "down"]).parse(direction));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
