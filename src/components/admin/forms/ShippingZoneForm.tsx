import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { saveShippingZone } from "@/lib/admin/actions";
import type { ShippingZone } from "@/types/database";

export function ShippingZoneForm({
  zone,
  countries,
}: {
  zone?: Partial<ShippingZone>;
  countries: { value: string; label: string }[];
}) {
  const action = saveShippingZone.bind(null, zone?.id ?? null);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3">
      <AdminFormField label="Country">
        <AdminSelect defaultValue={zone?.country_id ?? ""} name="country_id" options={countries} required />
      </AdminFormField>
      <AdminFormField label="Name">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={zone?.name ?? ""} name="name" required />
      </AdminFormField>
      <AdminFormField label="Code">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={zone?.code ?? ""} name="code" />
      </AdminFormField>
      <AdminFormField label="Fee">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(zone?.fee ?? "")} min="0" name="fee" required step="0.01" type="number" />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(zone?.sort_order ?? "")} name="sort_order" type="number" />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox defaultChecked={zone?.is_active ?? true} label="Active" name="is_active" />
      </div>
      <div className="md:col-span-3">
        <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Save zone
        </button>
      </div>
    </form>
  );
}
