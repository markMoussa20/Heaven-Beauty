import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveCountry } from "@/lib/admin/actions";
import type { Country } from "@/types/database";

export function CountryForm({ country }: { country?: Partial<Country> }) {
  const action = saveCountry.bind(null, country?.id ?? null);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField label="Name">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.name ?? ""} name="name" required />
      </AdminFormField>
      <AdminFormField label="Code">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.code ?? ""} name="code" required />
      </AdminFormField>
      <AdminFormField label="Currency code">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.currency_code ?? ""} name="currency_code" required />
      </AdminFormField>
      <AdminFormField label="Currency symbol">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.currency_symbol ?? ""} name="currency_symbol" required />
      </AdminFormField>
      <AdminFormField label="Phone">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.phone ?? ""} name="phone" />
      </AdminFormField>
      <AdminFormField label="WhatsApp">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.whatsapp ?? ""} name="whatsapp" />
      </AdminFormField>
      <AdminFormField label="Domain">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.domain ?? ""} name="domain" />
      </AdminFormField>
      <AdminFormField label="Global delivery fee">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(country?.global_delivery_fee ?? "")} min="0" name="global_delivery_fee" type="number" step="0.01" />
      </AdminFormField>
      <AdminFormField label="Delivery label">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.delivery_label ?? ""} name="delivery_label" />
      </AdminFormField>
      <AdminFormField label="Price conversion base currency">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={country?.price_conversion_base_currency ?? ""} name="price_conversion_base_currency" />
      </AdminFormField>
      <div className="flex flex-wrap gap-4 md:col-span-2">
        <InlineCheckbox defaultChecked={country?.is_active ?? true} label="Active" name="is_active" />
        <InlineCheckbox defaultChecked={country?.use_shipping_zones ?? false} label="Use shipping zones" name="use_shipping_zones" />
        <InlineCheckbox defaultChecked={country?.price_conversion_enabled ?? false} label="Price conversion enabled" name="price_conversion_enabled" />
      </div>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save country
        </SubmitButton>
      </div>
    </form>
  );
}
