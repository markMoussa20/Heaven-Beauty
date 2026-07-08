import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { savePublicPageFaqItem } from "@/lib/admin/actions";
import type { PublicPageFaqItem } from "@/types/database";

export function PublicPageFaqItemForm({
  item,
}: {
  item?: Partial<PublicPageFaqItem>;
}) {
  const action = savePublicPageFaqItem.bind(null, item?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Page slug">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={item?.page_slug ?? "faq"}
          name="page_slug"
          required
        />
      </AdminFormField>
      <AdminFormField label="Group">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={item?.group_title ?? ""}
          name="group_title"
          placeholder="Orders"
        />
      </AdminFormField>
      <AdminFormField label="Question">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={item?.question ?? ""}
          name="question"
          required
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={item?.sort_order ?? ""}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <AdminFormField label="Answer">
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 px-3 py-2"
          defaultValue={item?.answer ?? ""}
          name="answer"
          required
        />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox
          defaultChecked={item?.is_active ?? true}
          label="Active"
          name="is_active"
        />
      </div>
      <div className="md:col-span-2">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Save FAQ item
        </button>
      </div>
    </form>
  );
}
