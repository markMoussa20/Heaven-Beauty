import Link from "next/link";

import type { DashboardAnalytics } from "@/lib/admin/dashboard-analytics";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  processing: "bg-violet-400",
  shipped: "bg-cyan-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-400",
};

export function DashboardCharts({
  analytics,
}: {
  analytics: DashboardAnalytics;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail={`${analytics.thirtyDayOrders} in the last 30 days`}
          href="/admin/orders"
          label="Total orders"
          value={analytics.totalOrders}
        />
        <MetricCard
          detail="Pending, confirmed, or processing"
          href="/admin/orders"
          label="Needs attention"
          value={analytics.pendingOrders}
        />
        <MetricCard
          detail="Unique customer profiles"
          href="/admin/customers"
          label="Customers"
          value={analytics.customers}
        />
        <MetricCard
          detail="Currently available in the catalog"
          href="/admin/products"
          label="Active products"
          value={analytics.activeProducts}
        />
      </div>

      {analytics.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Some dashboard data could not be loaded: {analytics.error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-zinc-950">Order volume</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Daily orders during the last 30 days
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {analytics.thirtyDayOrders} orders
            </span>
          </div>
          <div className="mt-6">
            <OrdersBarChart data={analytics.dailyOrders} />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div>
            <h2 className="font-semibold text-zinc-950">Order status</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Distribution for the last 30 days
            </p>
          </div>
          <StatusChart
            statuses={analytics.statuses}
            total={analytics.thirtyDayOrders}
          />
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div>
            <h2 className="font-semibold text-zinc-950">Orders by country</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Where orders came from in the last 30 days
            </p>
          </div>
          <CountryBars countries={analytics.countries} />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div>
            <h2 className="font-semibold text-zinc-950">30-day order value</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Kept separate by currency to avoid misleading conversions
            </p>
          </div>
          <RevenueByCurrency currencies={analytics.revenueByCurrency} />
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-zinc-950">Recent orders</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Latest customer activity
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-zinc-700 hover:text-zinc-950"
            href="/admin/orders"
          >
            View all
          </Link>
        </div>
        {analytics.recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Country</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {analytics.recentOrders.map((order) => (
                  <tr className="hover:bg-zinc-50" key={order.href}>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-zinc-950 hover:underline"
                        href={order.href}
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">{order.date}</p>
                    </td>
                    <td className="px-5 py-4 text-zinc-700">{order.customer}</td>
                    <td className="px-5 py-4 text-zinc-700">{order.country}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-zinc-700">
                        <span
                          className={`size-2 rounded-full ${
                            statusStyles[order.status.toLowerCase()] ??
                            "bg-zinc-400"
                          }`}
                        />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-zinc-950">
                      {order.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No orders have been placed yet." />
        )}
      </section>
    </>
  );
}

function MetricCard({
  detail,
  href,
  label,
  value,
}: {
  detail: string;
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
      href={href}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </Link>
  );
}

function OrdersBarChart({
  data,
}: {
  data: Array<{ date: string; label: string; value: number }>;
}) {
  const width = 720;
  const height = 230;
  const padding = { bottom: 36, left: 34, right: 10, top: 24 };
  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const max = Math.max(1, ...data.map((point) => point.value));
  const gap = 4;
  const barWidth = Math.max(4, plotWidth / data.length - gap);

  return (
    <svg
      aria-label={`Bar chart showing ${data.reduce((sum, point) => sum + point.value, 0)} orders over 30 days`}
      className="h-auto w-full text-zinc-900"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>Daily order volume for the last 30 days</title>
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + plotHeight - plotHeight * ratio;
        return (
          <g key={ratio}>
            <line
              stroke="#e4e4e7"
              strokeWidth="1"
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
            />
            <text
              fill="#71717a"
              fontSize="10"
              textAnchor="end"
              x={padding.left - 8}
              y={y + 3}
            >
              {Math.round(max * ratio)}
            </text>
          </g>
        );
      })}
      {data.map((point, index) => {
        const x = padding.left + (plotWidth / data.length) * index + gap / 2;
        const barHeight =
          point.value === 0 ? 0 : Math.max(3, (point.value / max) * plotHeight);
        const y = padding.top + plotHeight - barHeight;
        const showLabel = index % 5 === 0 || index === data.length - 1;
        return (
          <g key={point.date}>
            <rect
              fill={index === data.length - 1 ? "#6c93c4" : "currentColor"}
              height={barHeight}
              rx="2"
              width={barWidth}
              x={x}
              y={y}
            >
              <title>
                {point.label}: {point.value}{" "}
                {point.value === 1 ? "order" : "orders"}
              </title>
            </rect>
            {point.value ? (
              <text
                fill="#3f3f46"
                fontSize="9"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={Math.max(11, y - 5)}
              >
                {point.value}
              </text>
            ) : null}
            {showLabel ? (
              <text
                fill="#71717a"
                fontSize="9"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={height - 12}
              >
                {point.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function StatusChart({
  statuses,
  total,
}: {
  statuses: DashboardAnalytics["statuses"];
  total: number;
}) {
  if (!statuses.length || total === 0) {
    return <EmptyState message="No status data for this period." />;
  }

  return (
    <div className="mt-7">
      <div
        aria-label="Order status distribution"
        className="flex h-3 overflow-hidden rounded-full bg-zinc-100"
        role="img"
      >
        {statuses.map((status) => (
          <span
            className={statusStyles[status.status] ?? "bg-zinc-400"}
            key={status.status}
            style={{ width: `${(status.value / total) * 100}%` }}
            title={`${status.label}: ${status.value}`}
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {statuses.map((status) => (
          <div
            className="flex items-center justify-between gap-4"
            key={status.status}
          >
            <span className="flex items-center gap-2 text-sm text-zinc-600">
              <span
                className={`size-2.5 rounded-full ${
                  statusStyles[status.status] ?? "bg-zinc-400"
                }`}
              />
              {status.label}
            </span>
            <span className="text-sm font-semibold text-zinc-950">
              {status.value}
              <span className="ml-2 font-normal text-zinc-400">
                {Math.round((status.value / total) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountryBars({
  countries,
}: {
  countries: DashboardAnalytics["countries"];
}) {
  if (!countries.length) {
    return <EmptyState message="No country data for this period." />;
  }
  const max = Math.max(...countries.map((country) => country.value), 1);

  return (
    <div className="mt-6 space-y-4">
      {countries.map((country) => (
        <div key={country.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-zinc-700">{country.label}</span>
            <span className="font-semibold text-zinc-950">{country.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#6c93c4]"
              style={{ width: `${(country.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueByCurrency({
  currencies,
}: {
  currencies: DashboardAnalytics["revenueByCurrency"];
}) {
  if (!currencies.length) {
    return <EmptyState message="No order value data for this period." />;
  }

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {currencies.map((currency) => (
        <div
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          key={currency.currency}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {currency.currency}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
            {currency.formatted}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
