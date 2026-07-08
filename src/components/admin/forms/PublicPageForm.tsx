import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { savePublicPage } from "@/lib/admin/actions";
import type { PublicPage } from "@/types/database";

export function PublicPageForm({ page }: { page?: Partial<PublicPage> }) {
  const action = savePublicPage.bind(null, page?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Slug" hint="Public URL, for example our-story.">
        <input
          aria-readonly={Boolean(page?.id)}
          className={`h-10 rounded-md border border-zinc-300 px-3 ${
            page?.id ? "bg-zinc-50 text-zinc-500" : ""
          }`}
          defaultValue={page?.slug ?? ""}
          name="slug"
          readOnly={Boolean(page?.id)}
          required
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={page?.sort_order ?? ""}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <AdminFormField label="Title">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={page?.title ?? ""}
          name="title"
          required
        />
      </AdminFormField>
      <AdminFormField label="Subtitle">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={page?.subtitle ?? ""}
          name="subtitle"
        />
      </AdminFormField>
      <AdminFormField label="Body">
        <textarea
          className="min-h-40 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={page?.body ?? ""}
          name="body"
        />
      </AdminFormField>
      <div className="grid gap-4">
        <AdminFormField label="Image URL">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={page?.image_url ?? ""}
            name="image_url"
          />
        </AdminFormField>
        <AdminFormField label="Image alt text">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={page?.image_alt ?? ""}
            name="image_alt"
          />
        </AdminFormField>
        <AdminFormField label="Second image URL">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={page?.secondary_image_url ?? ""}
            name="secondary_image_url"
          />
        </AdminFormField>
        <AdminFormField label="Second image alt text">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={page?.secondary_image_alt ?? ""}
            name="secondary_image_alt"
          />
        </AdminFormField>
      </div>
      <AdminFormField label="Button label">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={page?.cta_label ?? ""}
          name="cta_label"
        />
      </AdminFormField>
      <AdminFormField label="Button link">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={page?.cta_href ?? ""}
          name="cta_href"
        />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={page?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="md:col-span-2">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Save page
        </button>
      </div>
    </form>
  );
}
