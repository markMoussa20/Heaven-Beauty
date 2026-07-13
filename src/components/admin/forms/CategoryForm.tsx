import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
    <AdminActionForm action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField label="Name">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.name ?? ""} name="name" required />
      </AdminFormField>
      <AdminFormField label="Slug">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.slug ?? ""} name="slug" />
      </AdminFormField>
      <AdminFormField label="Parent category">
        <AdminSelect defaultValue={category?.parent_id ?? ""} name="parent_id" options={categories.filter((item) => item.value !== category?.id)} />
      </AdminFormField>
      <AdminFormField hint="Uploading replaces this image." label="Image">
        <div className="grid gap-2">
          {category?.image_url ? (
            <a className="text-xs text-zinc-500 underline" href={category.image_url} rel="noreferrer" target="_blank">
              View current image
            </a>
          ) : (
            <p className="text-xs text-zinc-500">No image uploaded yet.</p>
          )}
          <ImageUploader name="category_image" />
        </div>
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={category?.sort_order ?? ""} name="sort_order" type="number" />
      </AdminFormField>
      <div className="flex items-end">
        <InlineCheckbox defaultChecked={category?.is_active ?? true} label="Active" name="is_active" />
      </div>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save category
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
