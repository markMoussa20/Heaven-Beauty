import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { saveCategory } from "@/lib/admin/actions";
import type { Category } from "@/types/database";

export function CategoryForm({
  category,
  categories,
}: {
  category?: Partial<Category>;
  categories: { value: string; label: string }[];
}) {
  const action = saveCategory.bind(null, category?.id ?? null);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField label="Name">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.name ?? ""} name="name" required />
      </AdminFormField>
      <AdminFormField label="Slug">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.slug ?? ""} name="slug" />
      </AdminFormField>
      <AdminFormField label="Parent category">
        <AdminSelect defaultValue={category?.parent_id ?? ""} name="parent_id" options={categories.filter((item) => item.value !== category?.id)} />
      </AdminFormField>
      <AdminFormField label="Image URL">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.image_url ?? ""} name="image_url" />
      </AdminFormField>
      <AdminFormField label="Image path">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.image_path ?? ""} name="image_path" />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.sort_order ?? ""} name="sort_order" type="number" />
      </AdminFormField>
      <AdminFormField label="Upload image">
        <ImageUploader name="category_image" />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox defaultChecked={category?.is_active ?? true} label="Active" name="is_active" />
      </div>
      <div className="md:col-span-2">
        <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Save category
        </button>
      </div>
    </form>
  );
}
