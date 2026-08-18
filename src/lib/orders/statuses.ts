/**
 * The single source of truth for order statuses.
 *
 * These values must stay in step with the `orders_status_check` constraint in
 * the database. Previously the list was duplicated across the server action,
 * the orders list filter, the order detail dropdown, and the dashboard labels,
 * and they had drifted: the admin screens offered `out_for_delivery` while the
 * database and the action's validator only accepted `shipped`, so choosing it
 * silently did nothing.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const DEFAULT_ORDER_STATUS: OrderStatus = "pending";

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status?: string | null) {
  const normalized = status?.toLowerCase() ?? "";
  return isOrderStatus(normalized)
    ? ORDER_STATUS_LABELS[normalized]
    : (status ?? ORDER_STATUS_LABELS[DEFAULT_ORDER_STATUS]).replaceAll("_", " ");
}

export function orderStatusTone(status?: string | null) {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "green" as const;
    case "cancelled":
      return "red" as const;
    case "pending":
      return "yellow" as const;
    default:
      return "blue" as const;
  }
}
