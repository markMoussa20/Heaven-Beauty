import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveCountryItem } from "@/lib/admin/actions";
import type { CountryItem } from "@/types/database";

export function CountryItemForm({
  item,
  countries,
  products,
}: {
  item?: Partial<CountryItem>;
  countries: { value: string; label: string }[];
  products: { value: string; label: string }[];
}) {
  const action = saveCountryItem.bind(null, item?.id ?? null);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3">
      <AdminFormField label="Country">
        <AdminSelect defaultValue={item?.country_id ?? ""} name="country_id" options={countries} required />
      </AdminFormField>
      <AdminFormField label="Product">
        <AdminSelect defaultValue={item?.product_id ?? ""} name="product_id" options={products} required />
      </AdminFormField>
      <AdminFormField label="Country SKU">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={item?.country_sku ?? item?.sku ?? ""} name="country_sku" />
      </AdminFormField>
      <AdminFormField label="Price">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(item?.price ?? "")} min="0" name="price" required step="0.01" type="number" />
      </AdminFormField>
      <AdminFormField label="Sale price">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(item?.sale_price ?? "")} min="0" name="sale_price" step="0.01" type="number" />
      </AdminFormField>
      <AdminFormField label="Stock quantity">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(item?.stock_quantity ?? "")} min="0" name="stock_quantity" type="number" />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(item?.sort_order ?? "")} name="sort_order" type="number" />
      </AdminFormField>
      <div className="flex items-end gap-4">
        <InlineCheckbox defaultChecked={item?.is_visible ?? true} label="Visible" name="is_visible" />
        <InlineCheckbox defaultChecked={item?.is_featured ?? false} label="Featured" name="is_featured" />
      </div>
      <div className="flex items-end">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save item
        </SubmitButton>
      </div>
    </form>
  );
}
