import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveSiteContent } from "@/lib/admin/actions";
import type { SiteContent } from "@/types/database";

export function SiteContentForm({ block }: { block?: Partial<SiteContent> }) {
  const action = saveSiteContent.bind(null, block?.id ?? null);

  return (
    <AdminActionForm
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Key" hint="Unique machine name, for example home_story.">
        <input
          className={`h-10 rounded-md border border-zinc-300 px-3 ${
            block?.id ? "bg-zinc-50 text-zinc-500" : ""
          }`}
          defaultValue={block?.key ?? ""}
          name="key"
          readOnly={Boolean(block?.id)}
          aria-readonly={Boolean(block?.id)}
          required
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.sort_order ?? ""}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <AdminFormField label="Title">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.title ?? ""}
          name="title"
        />
      </AdminFormField>
      <AdminFormField label="Subtitle">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.subtitle ?? ""}
          name="subtitle"
        />
      </AdminFormField>
      <AdminFormField label="Body">
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={block?.body ?? ""}
          name="body"
        />
      </AdminFormField>
      <AdminFormField label="Marquee text">
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={block?.marquee_text ?? ""}
          name="marquee_text"
        />
      </AdminFormField>
      <AdminFormField label="Button label">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.cta_label ?? ""}
          name="cta_label"
        />
      </AdminFormField>
      <AdminFormField label="Button link">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.cta_href ?? ""}
          name="cta_href"
        />
      </AdminFormField>
      <AdminFormField label="Image URL">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.image_url ?? ""}
          name="image_url"
        />
      </AdminFormField>
      <AdminFormField
        hint="Upload replaces the image URL after saving."
        label="Image upload"
      >
        <ImageUploader name="content_primary_image" />
      </AdminFormField>
      <AdminFormField label="Image alt text">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.image_alt ?? ""}
          name="image_alt"
        />
      </AdminFormField>
      <AdminFormField label="Second image URL">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.secondary_image_url ?? ""}
          name="secondary_image_url"
        />
      </AdminFormField>
      <AdminFormField
        hint="Upload replaces the second image URL after saving."
        label="Second image upload"
      >
        <ImageUploader name="content_secondary_image" />
      </AdminFormField>
      <AdminFormField label="Second image alt text">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={block?.secondary_image_alt ?? ""}
          name="secondary_image_alt"
        />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={block?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="md:col-span-2">
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save content
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
