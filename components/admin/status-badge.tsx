import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/order-status";

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-300",
  CONFIRMED: "bg-sky-100 text-sky-900 ring-sky-300",
  SHIPPED: "bg-violet-100 text-violet-900 ring-violet-300",
  DELIVERED: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  CANCELLED: "bg-neutral-200 text-neutral-600 ring-neutral-300 line-through decoration-1",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
