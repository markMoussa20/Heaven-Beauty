import { AdminFormField } from "@/components/admin/AdminFormField";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveProduct } from "@/lib/admin/actions";
import type { AdminRow } from "@/lib/admin/data";
import type { Product } from "@/types/database";

export function ProductForm({
  product,
  categories,
  selectedCategoryIds = [],
}: {
  product?: Partial<Product>;
  categories: { value: string; label: string }[];
  selectedCategoryIds?: string[];
}) {
  const action = saveProduct.bind(null, product?.id ?? null);

  return (
    <AdminActionForm action={action} className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="Name">
          <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={product?.name ?? ""} name="name" required />
        </AdminFormField>
        <AdminFormField label="Slug">
          <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={product?.slug ?? ""} name="slug" />
        </AdminFormField>
        <AdminFormField label="Brand">
          <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={product?.brand ?? ""} name="brand" />
        </AdminFormField>
        <AdminFormField label="Base SKU">
          <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={product?.base_sku ?? ""} name="base_sku" />
        </AdminFormField>
      </div>
      <AdminFormField label="Short description">
        <textarea className="min-h-20 rounded-md border border-zinc-300 px-3 py-2" defaultValue={product?.short_description ?? ""} name="short_description" />
      </AdminFormField>
      <AdminFormField label="Description">
        <textarea className="min-h-32 rounded-md border border-zinc-300 px-3 py-2" defaultValue={product?.description ?? ""} name="description" />
      </AdminFormField>
      <AdminFormField label="Ingredients" hint="Shown on the product details page.">
        <textarea className="min-h-28 rounded-md border border-zinc-300 px-3 py-2" defaultValue={product?.ingredients ?? ""} name="ingredients" />
      </AdminFormField>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="Main image upload" hint="png, jpg, jpeg, webp up to 5MB">
          <div className="grid gap-2">
            {product?.main_image_url ? (
              <a className="text-xs text-zinc-500 underline" href={product.main_image_url} rel="noreferrer" target="_blank">
                View current image
              </a>
            ) : (
              <p className="text-xs text-zinc-500">No image uploaded yet.</p>
            )}
            <ImageUploader name="image" />
          </div>
        </AdminFormField>
        <AdminFormField label="Gallery image upload" hint="Upload multiple images. Stored in product_images.">
          <ImageUploader multiple name="gallery" />
        </AdminFormField>
      </div>
      <AdminFormField label="Categories">
        <div className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <label className="flex items-center gap-2 text-sm" key={category.value}>
              <input
                defaultChecked={selectedCategoryIds.includes(category.value)}
                name="category_ids"
                type="checkbox"
                value={category.value}
              />
              {category.label}
            </label>
          ))}
        </div>
      </AdminFormField>
      <InlineCheckbox defaultChecked={product?.is_active ?? true} label="Active" name="is_active" />
      <div>
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save product
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}

export function ProductLinks({ rows }: { rows: AdminRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-zinc-500">No country items linked.</p>;
  }

  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div className="rounded-md border border-zinc-200 p-3 text-sm" key={row.id}>
          {String((row.countries as AdminRow | undefined)?.name ?? "Country")} -{" "}
          {String(row.price ?? "0")}
        </div>
      ))}
    </div>
  );
}
