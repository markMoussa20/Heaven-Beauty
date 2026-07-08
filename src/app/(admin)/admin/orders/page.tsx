import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import type { Order } from "@/types/database";

function statusTone(status?: string | null) {
  if (status === "delivered") return "green";
  if (status === "cancelled") return "red";
  if (status === "pending") return "yellow";
  return "blue";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country_id?: string; status?: string }>;
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
      order: "created_at",
      ascending: false,
    }),
  ]);
  const orders = data as (Order & { countries?: AdminRow })[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Orders" description="View orders and update statuses. Financial totals are read-only." />
      <SearchForm
        filters={
          <>
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="country_id">
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>{country.label}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="status">
              <option value="">All statuses</option>
              {["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </>
        }
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
              <StatusBadge tone={statusTone(row.status)}>
                {row.status ?? "pending"}
              </StatusBadge>
            ),
          },
          { key: "total", header: "Total", render: (row) => `${row.currency_code ?? ""} ${row.total ?? "-"}` },
          { key: "date", header: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" },
        ]}
        rows={orders}
      />
    </div>
  );
}
