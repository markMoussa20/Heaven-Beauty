import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { ProductForm, ProductLinks } from "@/components/admin/forms/ProductForm";
import { deleteProductImage } from "@/lib/admin/actions";
import { getOptions, getRow, listRows, type AdminRow } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductImageUrl } from "@/lib/storage/product-images";
import type { Product } from "@/types/database";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: product, error }, categories, productCategories, countryItems] =
    await Promise.all([
      getRow("products", id, "*, product_images(*), product_categories(*), country_items(*, countries(name))"),
      getOptions("categories"),
      listRows("product_categories", { filters: { product_id: id } }),
      listRows("country_items", {
        filters: { product_id: id },
        select: "*, countries(name)",
      }),
    ]);

  const selectedCategoryIds = productCategories.data.map((row) =>
    String(row.category_id),
  );
  const images = ((product?.product_images as AdminRow[] | undefined) ?? []);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit product" description="Manage product content, category assignment, and uploaded images." />
      <ErrorMessage message={error} />
      {product ? (
        <>
          <ProductForm
            categories={categories}
            product={product as Product}
            selectedCategoryIds={selectedCategoryIds}
          />
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Gallery images</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {images.map((image) => (
                <div className="rounded-md border border-zinc-200 p-3" key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="aspect-square w-full rounded bg-zinc-100 object-cover"
                    src={getProductImageUrl(supabase, String(image.storage_path)) ?? ""}
                  />
                  <form
                    action={deleteProductImage.bind(
                      null,
                      image.id,
                      String(image.storage_path),
                      id,
                    )}
                    className="mt-3"
                  >
                    <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Delete this gallery image from storage and database?">
                      Delete image
                    </ConfirmSubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Linked country items</h2>
            <div className="mt-4">
              <ProductLinks rows={countryItems.data} />
            </div>
          </section>
        </>
      ) : (
        <ErrorMessage message="Product not found." />
      )}
    </div>
  );
}
