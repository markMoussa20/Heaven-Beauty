import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/forms/ProductForm";
import { getOptions } from "@/lib/admin/data";

export const metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await getOptions("categories");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="New product" description="Upload images directly — external image URLs are no longer supported." />
      <ProductForm categories={categories} />
    </div>
  );
}
