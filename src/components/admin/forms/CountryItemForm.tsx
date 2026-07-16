import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveCountryItem } from "@/lib/admin/actions";
import type { CountryItem } from "@/types/database";

export function CountryItemForm({
  item,
  countries,
  products,
  submitLabel,
}: {
  item?: Partial<CountryItem>;
  countries: { value: string; label: string }[];
  products: { value: string; label: string }[];
  submitLabel?: string;
}) {
  const action = saveCountryItem.bind(null, item?.id ?? null);

  return (
    <AdminActionForm
      action={action}
      className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="Country" hint="Where this product can be sold.">
          <AdminSelect
            defaultValue={item?.country_id ?? ""}
            name="country_id"
            options={countries}
            placeholder="Choose country"
            required
          />
        </AdminFormField>
        <AdminFormField label="Product" hint="The catalog product attached to this country.">
          <AdminSelect
            defaultValue={item?.product_id ?? ""}
            name="product_id"
            options={products}
            placeholder="Choose product"
            required
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminFormField label="Price" hint="Regular selling price.">
          <input
            className="h-11 rounded-md border border-zinc-300 px-3"
            defaultValue={String(item?.price ?? "")}
            min="0"
            name="price"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
        </AdminFormField>
        <AdminFormField label="Stock" hint="Available quantity.">
          <input
            className="h-11 rounded-md border border-zinc-300 px-3"
            defaultValue={String(item?.stock_quantity ?? "")}
            min="0"
            name="stock_quantity"
            placeholder="0"
            type="number"
          />
        </AdminFormField>
        <AdminFormField label="Sort order" hint="Lower numbers appear first.">
          <input
            className="h-11 rounded-md border border-zinc-300 px-3"
            defaultValue={String(item?.sort_order ?? "")}
            name="sort_order"
            placeholder="10"
            type="number"
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <AdminFormField label="Country SKU" hint="Optional code for this country-specific item.">
          <input
            className="h-11 rounded-md border border-zinc-300 px-3"
            defaultValue={item?.country_sku ?? item?.sku ?? ""}
            name="country_sku"
            placeholder="Example: HB-PURE-LB"
          />
        </AdminFormField>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Storefront status
          </p>
          <div className="flex flex-wrap gap-4">
            <InlineCheckbox
              defaultChecked={item?.is_visible ?? true}
              label="Visible in shop"
              name="is_visible"
            />
            <InlineCheckbox
              defaultChecked={item?.is_featured ?? false}
              label="Featured on home"
              name="is_featured"
            />
            <InlineCheckbox
              defaultChecked={item?.show_in_home_shop_popup ?? false}
              label="Show in homepage Shop popup"
              name="show_in_home_shop_popup"
            />
          </div>
          <p className="mt-3 max-w-xl text-xs leading-5 text-zinc-500">
            Shows this country-specific product in the “Choose your tint”
            popup opened by the Shop button in the homepage “Introducing PURE”
            section. It must also be visible and featured.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton className="h-10 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white">
          {submitLabel ?? (item?.id ? "Save changes" : "Create item")}
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
