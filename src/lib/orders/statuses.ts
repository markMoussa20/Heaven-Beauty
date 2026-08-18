/**
 * The single source of truth for order statuses.
 *
 * These values are copied from the live `orders_status_check` constraint:
 *   CHECK (status = ANY (ARRAY['pending', 'confirmed', 'processing',
 *                              'out_for_delivery', 'delivered', 'cancelled']))
 *
 * The list used to be duplicated across the server action, the orders filter,
 * the order detail dropdown, and the dashboard labels, and had drifted. The
 * admin screens were correct with `out_for_delivery`; the action's validator
 * still said `shipped`, so picking the real value was silently rejected.
 *
 * Note that supabase/migrations/202607110001_core_schema.sql also still says
 * `shipped` — that file no longer matches the database. Verify against the
 * constraint itself, not the migration, before changing this list.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
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
