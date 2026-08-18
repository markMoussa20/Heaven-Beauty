import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { ExportButton } from "@/components/admin/ExportButton";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import {
  ORDER_STATUSES,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/orders/statuses";
import type { Order } from "@/types/database";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    country_id?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const [countries, { data, error }] = await Promise.all([
    getOptions("countries"),
    listRows("orders", {
      select: "*, countries(name,currency_code)",
      search: params.q,
      searchColumns: ["order_number", "customer_phone", "customer_name"],
      filters: {
        country_id: params.country_id,
        status: params.status,
      },
      from: params.from,
      to: params.to,
      order: "created_at",
      ascending: false,
    }),
  ]);
  const orders = data as (Order & { countries?: AdminRow })[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader title="Orders" description="View orders and update statuses. Financial totals are read-only." />
        <ExportButton
          filters={{
            country_id: params.country_id,
            from: params.from,
            q: params.q,
            status: params.status,
            to: params.to,
          }}
          href="/api/admin/exports/orders"
        />
      </div>
      <SearchForm
        filters={
          <>
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue={params.country_id ?? ""} name="country_id">
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>{country.label}</option>
              ))}
            </select>
            <input
              aria-label="From date"
              className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue={params.from ?? ""}
              name="from"
              type="date"
            />
            <input
              aria-label="To date"
              className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue={params.to ?? ""}
              name="to"
              type="date"
            />
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue={params.status ?? ""} name="status">
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          </>
        }
        defaultQuery={params.q}
        placeholder="Search order number, phone, name..."
      />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          {
            key: "order",
            header: "Order",
            render: (row) => (
              <Link className="font-medium text-zinc-950 underline" href={`/admin/orders/${row.id}`}>
                {row.order_number ?? row.id}
              </Link>
            ),
          },
          { key: "customer", header: "Customer", render: (row) => row.customer_name ?? row.customer_phone ?? "-" },
          { key: "country", header: "Country", render: (row) => String(row.countries?.name ?? row.country_id) },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge tone={orderStatusTone(row.status)}>
                {orderStatusLabel(row.status)}
              </StatusBadge>
            ),
          },
          { key: "total", header: "Total", render: (row) => `${row.currency_code ?? ""} ${row.total ?? "-"}` },
          { key: "date", header: "Created", render: (row) => <LocalDateTime value={row.created_at} /> },
        ]}
        rows={orders}
      />
    </div>
  );
}
