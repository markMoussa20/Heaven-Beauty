import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { AdminUserForm } from "@/components/admin/forms/AdminUserForm";
import { SearchForm } from "@/components/admin/SearchForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteAdminUser, setAdminUserActive } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { listRows } from "@/lib/admin/data";
import type { AdminUser } from "@/types/database";

export const metadata = { title: "Admin Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, requireAdmin()]);
  const { data, error } = await listRows("admin_users", {
    order: "created_at",
    ascending: false,
    search: params.q,
    searchColumns: ["full_name", "email"],
  });
  const adminUsers = data as AdminUser[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Users"
        description="Create and manage the people who can sign in to this dashboard."
      />
      <SearchForm placeholder="Search admin users..." />
      <details className="rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-zinc-950">Add admin user</summary>
        <div className="mt-4">
          <AdminUserForm />
        </div>
      </details>
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "name", header: "Name", render: (row) => row.full_name ?? "-" },
          { key: "email", header: "Email", render: (row) => row.email ?? "-" },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                {row.is_active ? "Active" : "Inactive"}
              </StatusBadge>
            ),
          },
          {
            key: "created",
            header: "Created",
            render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-",
          },
          {
            key: "access",
            header: "Access",
            render: (row) => {
              const isCurrentUser = row.user_id === session.userId;
              return (
                <form action={setAdminUserActive.bind(null, row.id, !row.is_active)}>
                  <button
                    className="text-sm font-medium text-zinc-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isCurrentUser && row.is_active}
                    title={isCurrentUser && row.is_active ? "You cannot deactivate your own account" : undefined}
                    type="submit"
                  >
                    {row.is_active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              );
            },
          },
          {
            key: "delete",
            header: "Delete",
            render: (row) => {
              const isCurrentUser = row.user_id === session.userId;
              if (isCurrentUser) {
                return <span className="text-sm text-zinc-400">Current user</span>;
              }
              return (
                <form action={deleteAdminUser.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
                    message={`Permanently delete ${row.email ?? "this admin user"}?`}
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              );
            },
          },
        ]}
        rows={adminUsers}
      />
      <div className="grid gap-4">
        {adminUsers.map((adminUser) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={adminUser.id}>
            <summary className="cursor-pointer font-medium">
              Edit {adminUser.full_name || adminUser.email || "admin user"}
            </summary>
            <div className="mt-4">
              <AdminUserForm adminUser={adminUser} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
