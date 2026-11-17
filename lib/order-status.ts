import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const satisfies readonly OrderStatus[];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/**
 * Forward-only fulfilment flow. CANCELLED is reached only through cancelOrder (which restocks),
 * never through the status dropdown, so stock can't be forgotten.
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "SHIPPED"],
  CONFIRMED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Cancelling after delivery would restock goods the customer has; not allowed. */
export const CANCELLABLE: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED"];
