"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cancelOrderAction, updateOrderStatusAction } from "@/lib/actions/admin/orders";
import { CANCELLABLE, NEXT_STATUSES, STATUS_LABEL } from "@/lib/order-status";

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const next = NEXT_STATUSES[status];
  const [target, setTarget] = useState<OrderStatus | "">(next[0] ?? "");
  // When the status changes after a save, reset the dropdown without remounting (keeps the message).
  const [seenStatus, setSeenStatus] = useState(status);
  if (status !== seenStatus) {
    setSeenStatus(status);
    setTarget(next[0] ?? "");
  }
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus() {
    if (!target) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, status, target);
      if (!res.ok) return setMsg({ kind: "error", text: res.error ?? "Couldn't update." });
      setMsg({ kind: "ok", text: `Marked as ${STATUS_LABEL[target].toLowerCase()}.` });
      router.refresh();
    });
  }

  function cancel() {
    setMsg(null);
    startTransition(async () => {
      const res = await cancelOrderAction(orderId);
      setConfirmCancel(false);
      if (!res.ok) return setMsg({ kind: "error", text: res.error ?? "Couldn't cancel." });
      const { restockedUnits, notRestocked } = res.data;
      setMsg({
        kind: "ok",
        text:
          `Order cancelled. ${restockedUnits} ${restockedUnits === 1 ? "unit" : "units"} returned to stock.` +
          (notRestocked.length ? ` Not restocked (size or product was deleted): ${notRestocked.join(", ")}.` : ""),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {next.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Update status</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as OrderStatus)}
              disabled={pending}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {next.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={changeStatus} disabled={pending || !target}>
            Save
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status === "CANCELLED" ? "This order was cancelled." : "This order is complete."} No further status changes.
        </p>
      )}

      {CANCELLABLE.includes(status) &&
        (confirmCancel ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p>Cancel this order? Its items go back into stock. This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={cancel} disabled={pending}>
                {pending ? "Cancelling…" : "Yes, cancel order"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)} disabled={pending}>
                Keep order
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="self-start text-destructive" onClick={() => setConfirmCancel(true)} disabled={pending}>
            Cancel order
          </Button>
        ))}

      {msg && (
        <p role={msg.kind === "error" ? "alert" : "status"} className={msg.kind === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
