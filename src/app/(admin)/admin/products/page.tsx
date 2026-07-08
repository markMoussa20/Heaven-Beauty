import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deactivateProduct } from "@/lib/admin/actions";
import { listRows } from "@/lib/admin/data";
import type { Product } from "@/types/database";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const filters =
    params.status === "active"
      ? { is_active: "true" }
      : params.status === "inactive"
        ? { is_active: "false" }
        : {};
  const { data, error } = await listRows("products", {
    order: "name",
    search: params.q,
    searchColumns: ["name", "slug", "base_sku", "brand"],
    filters,
  });
  const products = data as Product[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={{ href: "/admin/products/new", label: "New product" }}
        title="Products"
        description="Products hold content and images. Sellable prices and stock are managed in country items."
      />
      <SearchForm
        filters={
          <select className="h-10 rounded-md border border-zinc-300 px-3 text-sm" name="status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
        placeholder="Search name, slug, SKU, brand..."
      />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "slug", header: "Slug", render: (row) => row.slug ?? "-" },
          { key: "sku", header: "SKU", render: (row) => row.base_sku ?? "-" },
          { key: "brand", header: "Brand", render: (row) => row.brand ?? "-" },
          {
            key: "active",
            header: "Status",
            render: (row) => (
              <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                {row.is_active ? "Active" : "Inactive"}
              </StatusBadge>
            ),
          },
          {
            key: "delete",
            header: "Deactivate",
            render: (row) => (
              <form action={deactivateProduct.bind(null, row.id)}>
                <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Deactivate this product?">
                  Deactivate
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        editHref={(row) => `/admin/products/${row.id}`}
        rows={products}
      />
    </div>
  );
}
