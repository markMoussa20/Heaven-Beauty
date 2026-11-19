import type { Order, OrderItem } from "@/types/database";

const MAX_NAME_LENGTH = 190;

type PackageOrder = Pick<Order, "id" | "order_number">;
type PackageItem = Pick<OrderItem, "product_name" | "quantity">;

export type WakilniPackage = {
  quantity: number;
  type_id: number;
  name: string;
  sku: string;
};

/**
 * One checkout order ships as one Wakilni package, however many cart lines it
 * has. The package name lists the contents so the driver can still see them.
 */
export function buildWakilniPackages(
  order: PackageOrder,
  items: PackageItem[],
  packageTypeId: number,
): WakilniPackage[] {
  const reference = order.order_number || order.id;
  const contents = items
    .map((item) => `${item.quantity}x ${item.product_name?.trim() || "Beauty product"}`)
    .join(", ");
  const fullName = contents ? `Order ${reference}: ${contents}` : `Order ${reference}`;
  const name =
    fullName.length > MAX_NAME_LENGTH ? `${fullName.slice(0, MAX_NAME_LENGTH - 1)}…` : fullName;

  return [{ quantity: 1, type_id: packageTypeId, name, sku: reference }];
}
