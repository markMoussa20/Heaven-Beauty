import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { CountryForm } from "@/components/admin/forms/CountryForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { saveCountry } from "@/lib/admin/actions";
import { listRows } from "@/lib/admin/data";
import type { Country } from "@/types/database";

export const metadata = { title: "Countries" };

export default async function AdminCountriesPage() {
  const { data, error } = await listRows("countries", { order: "name" });
  const countries = data as Country[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Countries"
        description="Countries are deactivated instead of deleted because products and orders depend on them."
      />
      <CountryForm />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "code", header: "Code", render: (row) => row.code },
          {
            key: "currency",
            header: "Currency",
            render: (row) => `${row.currency_symbol} ${row.currency_code}`,
          },
          {
            key: "delivery",
            header: "Delivery",
            render: (row) =>
              row.use_shipping_zones
                ? "Uses shipping zones"
                : `Global fee ${row.global_delivery_fee ?? 0}`,
          },
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
            key: "action",
            header: "Action",
            render: (row) => (
              <form action={async (formData) => { "use server"; await saveCountry(row.id, null, formData); }}>
                <input name="name" type="hidden" value={row.name} />
                <input name="code" type="hidden" value={row.code} />
                <input name="currency_code" type="hidden" value={row.currency_code} />
                <input name="currency_symbol" type="hidden" value={row.currency_symbol} />
                <input name="global_delivery_fee" type="hidden" value={String(row.global_delivery_fee ?? "")} />
                <input name="delivery_label" type="hidden" value={row.delivery_label ?? ""} />
                <ConfirmSubmitButton
                  className="text-sm font-medium text-zinc-950 underline"
                  message="Toggle this country active status?"
                >
                  {row.is_active ? "Deactivate" : "Activate"}
                </ConfirmSubmitButton>
                {!row.is_active ? <input name="is_active" type="hidden" value="on" /> : null}
                {row.use_shipping_zones ? <input name="use_shipping_zones" type="hidden" value="on" /> : null}
              </form>
            ),
          },
        ]}
        rows={countries}
      />
      <div className="grid gap-4">
        {countries.map((country) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={country.id}>
            <summary className="cursor-pointer font-medium">Edit {country.name}</summary>
            <div className="mt-4">
              <CountryForm country={country} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
