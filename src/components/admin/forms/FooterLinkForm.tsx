import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { saveFooterLink } from "@/lib/admin/actions";
import type { FooterLink } from "@/types/database";

const footerGroups = [
  { label: "About", value: "about" },
  { label: "Shop", value: "shop" },
  { label: "Care", value: "care" },
  { label: "Social", value: "social" },
];

export function FooterLinkForm({ link }: { link?: Partial<FooterLink> }) {
  const action = saveFooterLink.bind(null, link?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3"
    >
      <AdminFormField label="Group">
        <AdminSelect
          defaultValue={link?.group_key ?? "about"}
          name="group_key"
          options={footerGroups}
          required
        />
      </AdminFormField>
      <AdminFormField label="Label">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={link?.label ?? ""}
          name="label"
          required
        />
      </AdminFormField>
      <AdminFormField label="Link">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={link?.href ?? ""}
          name="href"
          required
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={link?.sort_order ?? ""}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={link?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={link?.is_external ?? false}
          label="External link"
          name="is_external"
        />
      </div>
      <div className="md:col-span-3">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Save footer link
        </button>
      </div>
    </form>
  );
}
