"use client";

import { useMemo, useState } from "react";

import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AdminDiscount, DiscountCategoryOption, DiscountItemOption } from "@/lib/admin/data";
import { saveDiscount } from "@/lib/admin/discount-actions";
import { orderCategoriesForPicker } from "@/lib/discounts/rules";
import { resolveCountryTimeZone } from "@/lib/promo-banners/schedule";
import type { Country, DiscountScope, DiscountValueType } from "@/types/database";

const inputClassName = "h-10 rounded-md border border-zinc-300 px-3";

function toDateTimeLocal(value: string | null | undefined) {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

export function DiscountForm({
  categories,
  countries,
  countryItems,
  discount,
}: {
  categories: DiscountCategoryOption[];
  countries: Country[];
  countryItems: DiscountItemOption[];
  discount?: AdminDiscount;
}) {
  const action = saveDiscount.bind(null, discount?.id ?? null);
  const [countryId, setCountryId] = useState(discount?.country_id ?? countries[0]?.id ?? "");
  const [scope, setScope] = useState<DiscountScope>(discount?.scope ?? "country");
  const [valueType, setValueType] = useState<DiscountValueType>(discount?.value_type ?? "percent");
  const [itemSearch, setItemSearch] = useState("");
  const country = countries.find((candidate) => candidate.id === countryId);
  const itemsForCountry = useMemo(
    () => countryItems.filter((item) => item.country_id === countryId),
    [countryId, countryItems],
  );
  const orderedCategories = useMemo(() => orderCategoriesForPicker(categories), [categories]);
  const fieldPrefix = discount?.id ?? "new";
  const search = itemSearch.trim().toLowerCase();

  return (
    <AdminActionForm action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField hint="Only visible to admins, e.g. Ramadan 2026 – LB." label="Internal name">
        <input className={inputClassName} defaultValue={discount?.name ?? ""} maxLength={120} name="name" required />
      </AdminFormField>
      <AdminFormField hint="Each discount applies to one country. Use Duplicate to reuse it elsewhere." label="Country">
        <select
          className={inputClassName}
          name="country_id"
          onChange={(event) => setCountryId(event.target.value)}
          required
          value={countryId}
        >
          {countries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.currency_code}){option.is_active ? "" : " – inactive"}
            </option>
          ))}
        </select>
      </AdminFormField>

      <AdminFormField label="Discount type">
        <select
          className={inputClassName}
          name="value_type"
          onChange={(event) => setValueType(event.target.value as DiscountValueType)}
          value={valueType}
        >
          <option value="percent">Percent off</option>
          <option value="amount">Fixed amount off</option>
        </select>
      </AdminFormField>
      <AdminFormField
        hint={
          valueType === "percent"
            ? "Between 0 and 100."
            : `In ${country?.currency_code ?? "the country's currency"}. Prices never go below 0.`
        }
        label={valueType === "percent" ? "Percent" : `Amount (${country?.currency_symbol ?? ""})`}
      >
        <input
          className={inputClassName}
          defaultValue={discount ? String(Number(discount.value)) : ""}
          inputMode="decimal"
          max={valueType === "percent" ? 100 : undefined}
          min={0.01}
          name="value"
          required
          step={0.01}
          type="number"
        />
      </AdminFormField>

      <fieldset className="grid gap-3 md:col-span-2">
        <legend className="mb-2 text-sm font-medium text-zinc-700">Applies to</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["country", "All items in the country"],
              ["category", "Categories"],
              ["items", "Specific items"],
            ] as const
          ).map(([value, label]) => (
            <label className="flex items-center gap-2 text-sm text-zinc-700" key={value}>
              <input checked={scope === value} name="scope" onChange={() => setScope(value)} type="radio" value={value} />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          When several discounts apply to an item, an item discount beats a category discount, which beats a
          country-wide one. Within the same level the biggest saving wins.
        </p>

        <div className={`grid max-h-72 gap-2 overflow-y-auto rounded-md border border-zinc-200 p-3${scope === "category" ? "" : " hidden"}`}>
          {orderedCategories.map(({ category, depth }) => (
            <label
              className="flex items-center gap-2 text-sm text-zinc-700"
              htmlFor={`${fieldPrefix}-category-${category.id}`}
              key={category.id}
              style={{ paddingLeft: `${depth * 1.25}rem` }}
            >
              <input
                defaultChecked={discount?.category_ids.includes(category.id) ?? false}
                id={`${fieldPrefix}-category-${category.id}`}
                name="category_ids"
                type="checkbox"
                value={category.id}
              />
              {category.name}
            </label>
          ))}
          <span className="text-xs text-zinc-500">Subcategories are included automatically.</span>
        </div>

        <div className={`grid gap-2 rounded-md border border-zinc-200 p-3${scope === "items" ? "" : " hidden"}`}>
          <input
            aria-label="Search items"
            className={inputClassName}
            onChange={(event) => setItemSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Search items"
            type="search"
            value={itemSearch}
          />
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {itemsForCountry.length === 0 ? (
              <p className="text-sm text-zinc-500">This country has no items yet.</p>
            ) : null}
            {itemsForCountry.map((item) => (
              // Filtered-out items stay rendered (hidden) so their checkbox is still submitted.
              <label
                className={
                  search && !item.label.toLowerCase().includes(search)
                    ? "hidden"
                    : "flex items-center gap-2 text-sm text-zinc-700"
                }
                htmlFor={`${fieldPrefix}-item-${item.id}`}
                key={item.id}
              >
                <input
                  defaultChecked={discount?.country_item_ids.includes(item.id) ?? false}
                  id={`${fieldPrefix}-item-${item.id}`}
                  name="country_item_ids"
                  type="checkbox"
                  value={item.id}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <AdminFormField
        hint={`In ${country ? resolveCountryTimeZone(country) : "the country's"} local time. Leave empty to start immediately.`}
        label="Starts at"
      >
        <input className={inputClassName} defaultValue={toDateTimeLocal(discount?.starts_at)} name="starts_at" type="datetime-local" />
      </AdminFormField>
      <AdminFormField hint="The discount stops at this moment. Leave empty to never end." label="Ends at">
        <input className={inputClassName} defaultValue={toDateTimeLocal(discount?.ends_at)} name="ends_at" type="datetime-local" />
      </AdminFormField>

      <div className="md:col-span-2">
        <InlineCheckbox defaultChecked={discount?.is_enabled ?? true} label="Enabled" name="is_enabled" />
      </div>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save discount
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
