import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { ExportButton } from "@/components/admin/ExportButton";
import { SearchForm } from "@/components/admin/SearchForm";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import type { Customer } from "@/types/database";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country_id?: string }>;
}) {
  const params = await searchParams;
  const [countries, { data, error }] = await Promise.all([
    getOptions("countries"),
    listRows("customers", {
      select: "*, countries(name)",
      search: params.q,
      searchColumns: ["full_name", "phone", "email"],
      filters: { country_id: params.country_id },
      order: "created_at",
      ascending: false,
    }),
  ]);
  const customers = data as (Customer & { countries?: AdminRow })[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader title="Customers" description="Customers are not deleted by default. Search and review customer history." />
        <ExportButton
          filters={{ country_id: params.country_id, q: params.q }}
          href="/api/admin/exports/customers"
        />
      </div>
      <SearchForm
        filters={
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue={params.country_id ?? ""} name="country_id">
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country.value} value={country.value}>{country.label}</option>
            ))}
          </select>
        }
        defaultQuery={params.q}
        placeholder="Search name, phone, email..."
      />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Name", render: (row) => row.full_name ?? "-" },
          { key: "phone", header: "Phone", render: (row) => row.phone ?? "-" },
          { key: "email", header: "Email", render: (row) => row.email ?? "-" },
          { key: "country", header: "Country", render: (row) => String(row.countries?.name ?? row.country_id ?? "-") },
          { key: "created", header: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" },
        ]}
        rows={customers}
      />
    </div>
  );
}
