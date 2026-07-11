import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveFooterSettings } from "@/lib/admin/actions";
import type { SiteContent } from "@/types/database";

export function FooterSettingsForm({
  settings,
}: {
  settings?: Partial<SiteContent>;
}) {
  const action = saveFooterSettings.bind(null, settings?.id ?? null);

  return (
    <AdminActionForm
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Brand title">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.title ?? ""}
          name="title"
          required
        />
      </AdminFormField>
      <AdminFormField label="Brand subtitle">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.subtitle ?? ""}
          name="subtitle"
        />
      </AdminFormField>
      <AdminFormField label="Footer description">
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={settings?.body ?? ""}
          name="body"
        />
      </AdminFormField>
      <AdminFormField label="Copyright text">
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={settings?.marquee_text ?? ""}
          name="marquee_text"
        />
      </AdminFormField>
      <AdminFormField label="Contact line 1">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.cta_label ?? ""}
          name="cta_label"
        />
      </AdminFormField>
      <AdminFormField label="Contact line 2">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.cta_href ?? ""}
          name="cta_href"
        />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={settings?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="md:col-span-2">
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save footer settings
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
