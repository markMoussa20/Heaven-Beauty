import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { ShippingZoneForm } from "@/components/admin/forms/ShippingZoneForm";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteRow } from "@/lib/admin/actions";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import type { ShippingZone } from "@/types/database";

export const metadata = { title: "Shipping" };

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ country_id?: string }>;
}) {
  const params = await searchParams;
  const [countries, { data, error }] = await Promise.all([
    getOptions("countries"),
    listRows("shipping_zones", {
      select: "*, countries(name,use_shipping_zones,global_delivery_fee)",
      filters: { country_id: params.country_id },
    }),
  ]);
  const zones = data as (ShippingZone & { countries?: AdminRow })[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Shipping Zones" description="Countries using zones use these fees. Countries not using zones use their global delivery fee." />
      <SearchForm
        filters={
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="country_id">
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country.value} value={country.value}>{country.label}</option>
            ))}
          </select>
        }
        placeholder="Search shipping zones..."
      />
      <ShippingZoneForm countries={countries} />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "country", header: "Country", render: (row) => String(row.countries?.name ?? row.country_id) },
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "code", header: "Code", render: (row) => row.code ?? "-" },
          { key: "fee", header: "Fee", render: (row) => row.fee },
          {
            key: "active",
            header: "Status",
            render: (row) => (
              <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                {row.is_active ? "Active" : "Inactive"}
              </StatusBadge>
            ),
          },
          {
            key: "delete",
            header: "Delete",
            render: (row) => (
              <form action={deleteRow.bind(null, "shipping_zones", row.id, "/admin/shipping")}>
                <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Delete this shipping zone?">
                  Delete
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        rows={zones}
      />
      <div className="grid gap-4">
        {zones.map((zone) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={zone.id}>
            <summary className="cursor-pointer font-medium">Edit {zone.name}</summary>
            <div className="mt-4">
              <ShippingZoneForm countries={countries} zone={zone} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
