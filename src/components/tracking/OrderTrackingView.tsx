import Link from "next/link";

import type { Order, OrderItem } from "@/types/database";

type TrackingOrder = Order & {
  countries?: {
    currency_code?: string | null;
    currency_symbol?: string | null;
    name?: string | null;
  } | null;
};

const progressStatuses = ["Ordered", "Confirmed", "In delivery", "Delivered"] as const;

function statusStep(order: TrackingOrder) {
  const status = `${order.wakilni_status ?? ""} ${order.status ?? ""}`.toLowerCase();
  if (/\bdelivered\b|\bcompleted\b/.test(status)) return 3;
  if (
    status.includes("out for delivery") ||
    status.includes("shipping") ||
    status.includes("shipped") ||
    status.includes("transit") ||
    status.includes("picked up")
  ) {
    return 2;
  }
  if (
    status.includes("confirm") ||
    status.includes("process") ||
    order.wakilni_sync_status === "submitted"
  ) {
    return 1;
  }
  return 0;
}

function displayStatus(order: TrackingOrder) {
  const status = `${order.wakilni_status ?? order.status ?? "Order received"}`.trim();
  return status.replaceAll("_", " ");
}

function money(order: TrackingOrder, value?: number | string | null) {
  const amount = Number(value ?? 0);
  const symbol = order.countries?.currency_symbol ?? "";
  const code = order.countries?.currency_code ?? order.currency_code ?? "";
  return `${symbol}${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })}${symbol ? "" : ` ${code}`}`.trim();
}

export function OrderTrackingView({
  items,
  order,
}: {
  items: OrderItem[];
  order: TrackingOrder;
}) {
  const step = statusStep(order);
  const isCancelled = `${order.wakilni_status ?? ""} ${order.status ?? ""}`
    .toLowerCase()
    .includes("cancel");
  const address = [
    order.address_line ?? order.address,
    order.apartment,
    order.city,
    order.shipping_area_name ?? order.shipping_area,
    order.countries?.name,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-[70vh] bg-[#e6ecf4] px-4 py-14 text-[#171412] md:py-24">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-[#6c93c4] underline-offset-4 hover:underline" href="/track-order">
          Track another order
        </Link>

        <div className="mt-6 bg-white p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-5 border-b border-[#e6ecf4] pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6c93c4]">
                Order {order.order_number ?? order.id}
              </p>
              <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em]">
                {isCancelled ? "Order cancelled" : displayStatus(order)}
              </h1>
              {order.created_at ? (
                <p className="mt-2 text-sm text-[#6c7180]">
                  Placed{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "long",
                  }).format(new Date(order.created_at))}
                </p>
              ) : null}
            </div>
            <p className="text-2xl font-semibold text-[#6c93c4]">
              {money(order, order.total)}
            </p>
          </div>

          {isCancelled ? (
            <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              This order has been cancelled. Contact us if you need help.
            </div>
          ) : (
            <ol className="mt-9 grid grid-cols-4 gap-2" aria-label="Order progress">
              {progressStatuses.map((label, index) => (
                <li className="min-w-0" key={label}>
                  <div
                    className={`h-1.5 ${index <= step ? "bg-[#6c93c4]" : "bg-[#dfe5ed]"}`}
                  />
                  <p
                    className={`mt-3 text-[11px] sm:text-xs ${
                      index <= step ? "font-semibold text-[#171412]" : "text-[#8b9099]"
                    }`}
                  >
                    {label}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-10 grid gap-8 border-t border-[#e6ecf4] pt-8 md:grid-cols-[1.25fr_0.75fr]">
            <section>
              <h2 className="text-lg font-semibold">Order details</h2>
              <div className="mt-5 divide-y divide-[#edf1f7] border-y border-[#edf1f7]">
                {items.map((item) => (
                  <div className="flex items-start justify-between gap-5 py-4" key={item.id}>
                    <div>
                      <p className="font-medium">{item.product_name ?? "Product"}</p>
                      <p className="mt-1 text-sm text-[#6c7180]">
                        {money(order, item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {money(
                        order,
                        item.total ?? Number(item.unit_price) * item.quantity,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6c7180]">Subtotal</dt>
                  <dd>{money(order, order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6c7180]">Delivery</dt>
                  <dd>{money(order, order.shipping_fee)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#edf1f7] pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{money(order, order.total)}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold">Delivery</h2>
                <p className="mt-3 text-sm leading-6 text-[#6c7180]">{address || "Address unavailable"}</p>
              </div>

              <div>
                <h2 className="text-lg font-semibold">Delivery status</h2>
                <p className="mt-3 text-sm leading-6 text-[#6c7180]">
                  {order.wakilni_status
                    ? displayStatus(order)
                    : order.wakilni_sync_status === "failed"
                      ? "We are arranging your delivery."
                      : "Delivery updates will appear here as your order progresses."}
                </p>
                <p className="mt-2 text-xs text-[#8b9099]">
                  Reference: {order.order_number ?? order.id}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
