import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus } from "@/lib/admin/actions";
import { getRow, listRows, type AdminRow } from "@/lib/admin/data";
import type { Order, OrderItem } from "@/types/database";

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ data: order, error }, items] = await Promise.all([
    getRow("orders", id, "*, countries(name,currency_code,currency_symbol), customers(*)"),
    listRows("order_items", {
      select: "*, products(name), country_items(products(name))",
      filters: { order_id: id },
    }),
  ]);
  const typedOrder = order as (Order & { countries?: AdminRow; customers?: AdminRow }) | null;
  const orderItems = items.data as (OrderItem & { products?: AdminRow; country_items?: AdminRow })[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Order ${typedOrder?.order_number ?? id}`} description="Update status only. Totals are read-only." />
      <ErrorMessage message={error ?? items.error} />
      {typedOrder ? (
        <>
          <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <div className="mt-1"><StatusBadge tone="blue">{typedOrder.status ?? "pending"}</StatusBadge></div>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Country</p>
              <p className="font-medium">{String(typedOrder.countries?.name ?? typedOrder.country_id)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Created</p>
              <p className="font-medium">{typedOrder.created_at ? new Date(typedOrder.created_at).toLocaleString() : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Customer</p>
              <p className="font-medium">{typedOrder.customer_name ?? String(typedOrder.customers?.full_name ?? "-")}</p>
              <p className="text-sm text-zinc-500">{typedOrder.customer_phone ?? String(typedOrder.customers?.phone ?? "")}</p>
              <p className="text-sm text-zinc-500">{typedOrder.customer_email ?? String(typedOrder.customers?.email ?? "")}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Address</p>
              <p className="font-medium">
                {typedOrder.address_line ?? typedOrder.address ?? "-"}
              </p>
              <p className="text-sm text-zinc-500">
                {typedOrder.shipping_area_name ?? typedOrder.shipping_area ?? ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Totals</p>
              <p className="font-medium">Subtotal: {typedOrder.subtotal ?? "-"}</p>
              <p className="font-medium">Shipping: {typedOrder.shipping_fee ?? "-"}</p>
              <p className="font-semibold">Total: {typedOrder.total ?? "-"}</p>
              <p className="text-sm text-zinc-500">Payment: {typedOrder.payment_method ?? "COD"}</p>
            </div>
          </section>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Update status</h2>
            <form action={updateOrderStatus.bind(null, id)} className="mt-3 flex gap-3">
              <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue={typedOrder.status ?? "pending"} name="status">
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button className="rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white" type="submit">
                Save
              </button>
            </form>
          </section>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-zinc-500">
                  <tr><th className="py-2">Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr className="border-t border-zinc-100" key={item.id}>
                      <td className="py-2">{item.product_name ?? String(item.products?.name ?? item.country_items?.products ?? "-")}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit_price}</td>
                      <td>{item.total ?? Number(item.quantity) * Number(item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <ErrorMessage message="Order not found." />
      )}
    </div>
  );
}
