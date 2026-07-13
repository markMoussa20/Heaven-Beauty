import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { CountryItemForm } from "@/components/admin/forms/CountryItemForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteRow } from "@/lib/admin/actions";
import { getOptions, listRows, type AdminRow } from "@/lib/admin/data";
import { resolveItemPrice } from "@/lib/pricing";
import type { CountryItem } from "@/types/database";

export const metadata = { title: "Country Items" };

type CountryItemParams = {
  country_id?: string;
  featured?: string;
  product_id?: string;
  q?: string;
  visibility?: string;
};

type CountryItemRow = CountryItem & {
  countries?: AdminRow;
  products?: AdminRow;
};

export default async function AdminCountryItemsPage({
  searchParams,
}: {
  searchParams: Promise<CountryItemParams>;
}) {
  const params = await searchParams;
  const [countries, products, { data, error }] = await Promise.all([
    getOptions("countries"),
    getOptions("products"),
    listRows("country_items", {
      select: "*, countries(name,currency_code,currency_symbol), products(name,base_sku,slug)",
      filters: {
        country_id: params.country_id,
        product_id: params.product_id,
      },
      order: "sort_order",
    }),
  ]);
  const rows = filterCountryItems(data as CountryItemRow[], params);
  const visibleCount = rows.filter((row) => row.is_visible).length;
  const featuredCount = rows.filter((row) => row.is_featured).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Country Items"
        description="Choose which products are sellable per country, then manage price, stock, visibility, and featured placement."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Matching items" value={rows.length} />
        <SummaryCard label="Visible in shop" value={visibleCount} />
        <SummaryCard label="Featured on home" value={featuredCount} />
      </section>

      <CountryItemFilters
        countries={countries}
        params={params}
        products={products}
      />

      <details className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-4 font-semibold text-zinc-950">
          Add a country item
          <span className="ml-2 font-normal text-zinc-500">
            Connect a product to a country with its own price and stock.
          </span>
        </summary>
        <div className="border-t border-zinc-100 p-4">
          <CountryItemForm
            countries={countries}
            products={products}
            submitLabel="Create country item"
          />
        </div>
      </details>

      <ErrorMessage message={error} />

      <div className="grid gap-4">
        {rows.length > 0 ? (
          rows.map((row) => (
            <CountryItemCard
              countries={countries}
              item={row}
              key={row.id}
              products={products}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-zinc-950">
              No country items match these filters
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Clear the filters or add a new country item above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryItemFilters({
  countries,
  params,
  products,
}: {
  countries: { value: string; label: string }[];
  params: CountryItemParams;
  products: { value: string; label: string }[];
}) {
  return (
    <form className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Search
        <input
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
          defaultValue={params.q ?? ""}
          name="q"
          placeholder="Product, SKU, country..."
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Country
        <select
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={params.country_id ?? ""}
          name="country_id"
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Product
        <select
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={params.product_id ?? ""}
          name="product_id"
        >
          <option value="">All products</option>
          {products.map((product) => (
            <option key={product.value} value={product.value}>
              {product.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Shop
        <select
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={params.visibility ?? ""}
          name="visibility"
        >
          <option value="">Any</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Home
        <select
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
          defaultValue={params.featured ?? ""}
          name="featured"
        >
          <option value="">Any</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button
          className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
          type="submit"
        >
          Filter
        </button>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
          href="/admin/country-items"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function CountryItemCard({
  countries,
  item,
  products,
}: {
  countries: { value: string; label: string }[];
  item: CountryItemRow;
  products: { value: string; label: string }[];
}) {
  const productName = asText(item.products?.name, item.product_id);
  const countryName = asText(item.countries?.name, item.country_id);
  const currencySymbol = asText(item.countries?.currency_symbol);
  const currencyCode = asText(item.countries?.currency_code);
  const baseSku = asText(item.products?.base_sku);
  const countrySku = item.country_sku ?? item.sku ?? "";
  const price = `${currencySymbol}${resolveItemPrice(item)}`;
  const regularPrice = `${currencySymbol}${item.price}`;
  const salePrice = item.sale_price ? `${currencySymbol}${item.sale_price}` : null;

  return (
    <details className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none p-4">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-950">
                {productName}
              </h2>
              <StatusBadge tone={item.is_visible ? "green" : "neutral"}>
                {item.is_visible ? "Visible" : "Hidden"}
              </StatusBadge>
              <StatusBadge tone={item.is_featured ? "blue" : "neutral"}>
                {item.is_featured ? "Featured" : "Not featured"}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {countryName}
              {currencyCode ? ` · ${currencyCode}` : ""}
              {baseSku || countrySku
                ? ` · SKU: ${countrySku || baseSku}`
                : ""}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Current price" value={price} />
            <Metric label="Stock" value={String(item.stock_quantity ?? 0)} />
            <Metric label="Sort" value={String(item.sort_order ?? "-")} />
          </div>

          <span className="text-sm font-semibold text-zinc-950">
            Edit details
          </span>
        </div>
      </summary>

      <div className="border-t border-zinc-100 p-4">
        <div className="mb-4 grid gap-3 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600 md:grid-cols-3">
          <Metric label="Regular price" value={regularPrice} />
          <Metric label="Sale price" value={salePrice ?? "-"} />
          <Metric label="Country item ID" value={item.id} />
        </div>
        <CountryItemForm
          countries={countries}
          item={item}
          products={products}
          submitLabel="Save country item"
        />
        <form
          action={deleteRow.bind(
            null,
            "country_items",
            item.id,
            "/admin/country-items",
          )}
          className="mt-3 text-right"
        >
          <ConfirmSubmitButton
            className="text-sm font-medium text-red-600 underline"
            message="Delete this country item if safe?"
          >
            Delete country item
          </ConfirmSubmitButton>
        </form>
      </div>
    </details>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function filterCountryItems(rows: CountryItemRow[], params: CountryItemParams) {
  const query = (params.q ?? "").trim().toLowerCase();

  return rows
    .filter((row) => {
      if (params.visibility === "visible" && !row.is_visible) return false;
      if (params.visibility === "hidden" && row.is_visible) return false;
      if (params.featured === "yes" && !row.is_featured) return false;
      if (params.featured === "no" && row.is_featured) return false;

      if (!query) return true;

      return [
        row.country_sku,
        row.sku,
        row.product_id,
        row.country_id,
        row.products?.name,
        row.products?.base_sku,
        row.products?.slug,
        row.countries?.name,
        row.countries?.currency_code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const countryCompare = asText(a.countries?.name).localeCompare(
        asText(b.countries?.name),
      );

      if (countryCompare !== 0) return countryCompare;

      return (
        Number(a.sort_order ?? 999999) - Number(b.sort_order ?? 999999) ||
        asText(a.products?.name).localeCompare(asText(b.products?.name))
      );
    });
}

function asText(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}
