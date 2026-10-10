import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { DiscountForm } from "@/components/admin/forms/DiscountForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { listDiscounts, type AdminDiscount, type DiscountCategoryOption, type DiscountItemOption } from "@/lib/admin/data";
import { deleteDiscount, duplicateDiscount } from "@/lib/admin/discount-actions";
import { formatDiscountValue, getDiscountStatus } from "@/lib/discounts/rules";
import { normalizeWallClock } from "@/lib/promo-banners/schedule";
import type { Country } from "@/types/database";

export const metadata = { title: "Discounts" };

function formatWallClock(value: string | null) {
  const normalized = normalizeWallClock(value);
  if (!normalized) return null;
  const [date, time] = normalized.split("T");
  return `${date} ${time.slice(0, 5)}`;
}

function targetsLabel(
  discount: AdminDiscount,
  categories: DiscountCategoryOption[],
  countryItems: DiscountItemOption[],
) {
  if (discount.scope === "country") return "All items";
  if (discount.scope === "category") {
    return discount.category_ids
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "No categories";
  }
  const names = discount.country_item_ids
    .map((id) => countryItems.find((item) => item.id === id)?.label)
    .filter(Boolean);
  return names.length <= 2 ? names.join(", ") || "No items" : `${names.length} items`;
}

function StatusCell({ discount, country }: { discount: AdminDiscount; country: Country | undefined }) {
  if (!country) return <StatusBadge tone="red">No country</StatusBadge>;

  switch (getDiscountStatus(discount, country, new Date())) {
    case "live":
      return <StatusBadge tone="green">Live</StatusBadge>;
    case "scheduled":
      return <StatusBadge tone="blue">Scheduled</StatusBadge>;
    case "expired":
      return <StatusBadge>Expired</StatusBadge>;
    case "disabled":
      return <StatusBadge tone="yellow">Disabled</StatusBadge>;
  }
}

export default async function DiscountsPage() {
  await requireAdmin();
  const { discounts, countries, categories, countryItems, error, missingMigration } = await listDiscounts();
  const countryById = new Map(countries.map((country) => [country.id, country]));

  if (missingMigration) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Discounts" description="Price discounts per country, category or item." />
        <ErrorMessage message="The discounts tables don't exist yet. Run supabase/migrations/202610100001_discounts.sql in the Supabase SQL editor, then reload this page." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discounts"
        description="Discount a whole country, some categories or specific items. Schedules run in each country's local time. An item discount beats a category discount, which beats a country-wide one."
      />
      <details className="rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-zinc-950">Add discount</summary>
        <div className="mt-4">
          <DiscountForm categories={categories} countries={countries} countryItems={countryItems} />
        </div>
      </details>
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Discount", render: (row) => <span className="font-medium text-zinc-950">{row.name}</span> },
          { key: "status", header: "Status", render: (row) => <StatusCell country={countryById.get(row.country_id)} discount={row} /> },
          { key: "country", header: "Country", render: (row) => countryById.get(row.country_id)?.name ?? "-" },
          { key: "targets", header: "Applies to", render: (row) => targetsLabel(row, categories, countryItems) },
          {
            key: "value",
            header: "Value",
            render: (row) =>
              formatDiscountValue(row.value_type, row.value, countryById.get(row.country_id)?.currency_symbol ?? ""),
          },
          {
            key: "schedule",
            header: "Schedule (local time)",
            render: (row) => (
              <div className="grid gap-1 text-sm">
                <span>From {formatWallClock(row.starts_at) ?? "now"}</span>
                <span>Until {formatWallClock(row.ends_at) ?? "no end"}</span>
              </div>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-3">
                <form action={duplicateDiscount.bind(null, row.id)}>
                  <button className="text-sm underline underline-offset-4" type="submit">
                    Duplicate
                  </button>
                </form>
                <form action={deleteDiscount.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline underline-offset-4"
                    message={`Permanently delete the "${row.name}" discount? Past orders keep their discount details.`}
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            ),
          },
        ]}
        rows={discounts}
      />
      <div className="grid gap-4">
        {discounts.map((discount) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={discount.id}>
            <summary className="cursor-pointer font-medium">Edit {discount.name}</summary>
            <div className="mt-4">
              <DiscountForm categories={categories} countries={countries} countryItems={countryItems} discount={discount} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
