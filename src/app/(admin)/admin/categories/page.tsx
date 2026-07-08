import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { CategoryForm } from "@/components/admin/forms/CategoryForm";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteRow } from "@/lib/admin/actions";
import { getOptions, listRows } from "@/lib/admin/data";
import type { Category } from "@/types/database";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const [{ data, error }, options] = await Promise.all([
    listRows("categories", {
      order: "sort_order",
      search: params.q,
      searchColumns: ["name", "slug"],
    }),
    getOptions("categories"),
  ]);
  const categories = data as Category[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Categories" description="Create, search, edit, and delete safe categories." />
      <SearchForm placeholder="Search categories..." />
      <CategoryForm categories={options} />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Name", render: (row) => row.name },
          { key: "slug", header: "Slug", render: (row) => row.slug ?? "-" },
          { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
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
            header: "Delete",
            render: (row) => (
              <form action={deleteRow.bind(null, "categories", row.id, "/admin/categories")}>
                <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Delete this category if safe?">
                  Delete
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        rows={categories}
      />
      <div className="grid gap-4">
        {categories.map((category) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={category.id}>
            <summary className="cursor-pointer font-medium">Edit {category.name}</summary>
            <div className="mt-4">
              <CategoryForm category={category} categories={options} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
