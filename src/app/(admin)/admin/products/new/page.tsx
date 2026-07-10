import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/forms/ProductForm";
import { getOptions } from "@/lib/admin/data";

export const metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await getOptions("categories");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="New product" description="Upload images instead of pasting URLs. Demo URL stays optional fallback only." />
      <ProductForm categories={categories} />
    </div>
  );
}
