import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { CountryItemForm } from "@/components/admin/forms/CountryItemForm";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteRow } from "@/lib/admin/actions";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import { resolveItemPrice } from "@/lib/pricing";
import type { CountryItem } from "@/types/database";

export const metadata = { title: "Country Items" };

export default async function AdminCountryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country_id?: string; product_id?: string }>;
}) {
  const params = await searchParams;
  const [countries, products, { data, error }] = await Promise.all([
    getOptions("countries"),
    getOptions("products"),
    listRows("country_items", {
      select: "*, countries(name,currency_code,currency_symbol), products(name,base_sku)",
      filters: {
        country_id: params.country_id,
        product_id: params.product_id,
      },
    }),
  ]);
  const rows = data as (CountryItem & { countries?: AdminRow; products?: AdminRow })[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Country Items" description="Manage sellable product price, stock, visibility, and featured status per country." />
      <SearchForm
        filters={
          <>
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="country_id">
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>{country.label}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="product_id">
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.value} value={product.value}>{product.label}</option>
              ))}
            </select>
          </>
        }
        placeholder="Search by product name or SKU..."
      />
      <CountryItemForm countries={countries} products={products} />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "country", header: "Country", render: (row) => String(row.countries?.name ?? row.country_id) },
          { key: "product", header: "Product", render: (row) => String(row.products?.name ?? row.product_id) },
          {
            key: "price",
            header: "Price",
            render: (row) =>
              `${String(row.countries?.currency_symbol ?? "")}${resolveItemPrice(row as CountryItem)}`,
          },
          { key: "stock", header: "Stock", render: (row) => row.stock_quantity ?? 0 },
          {
            key: "visible",
            header: "Visible",
            render: (row) => (
              <StatusBadge tone={row.is_visible ? "green" : "neutral"}>
                {row.is_visible ? "Visible" : "Hidden"}
              </StatusBadge>
            ),
          },
          {
            key: "featured",
            header: "Featured",
            render: (row) => (
              <StatusBadge tone={row.is_featured ? "blue" : "neutral"}>
                {row.is_featured ? "Featured" : "No"}
              </StatusBadge>
            ),
          },
          {
            key: "delete",
            header: "Delete",
            render: (row) => (
              <form action={deleteRow.bind(null, "country_items", row.id, "/admin/country-items")}>
                <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Delete this country item if safe?">
                  Delete
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        rows={rows}
      />
      <div className="grid gap-4">
        {rows.map((row) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={row.id}>
            <summary className="cursor-pointer font-medium">Edit {String(row.products?.name ?? row.id)}</summary>
            <div className="mt-4">
              <CountryItemForm countries={countries} item={row} products={products} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
