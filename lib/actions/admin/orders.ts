"use server";

import { revalidatePath } from "next/cache";
import { cancelOrder, updateOrderStatus } from "@/lib/services/admin/orders";
import { idSchema, orderStatusSchema } from "@/lib/validation/admin";
import { assertAdmin, fail, type ActionResult } from "./result";

export async function updateOrderStatusAction(orderId: unknown, from: unknown, to: unknown): Promise<ActionResult> {
  try {
    await assertAdmin();
    await updateOrderStatus(idSchema.parse(orderId), orderStatusSchema.parse(from), orderStatusSchema.parse(to));
    revalidatePath("/admin/orders", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelOrderAction(orderId: unknown): Promise<ActionResult<{ restockedUnits: number; notRestocked: string[] }>> {
  try {
    await assertAdmin();
    const result = await cancelOrder(idSchema.parse(orderId));
    revalidatePath("/admin", "layout");
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}
