import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminFormField } from "@/components/admin/AdminFormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveAdminUser } from "@/lib/admin/actions";
import type { AdminUser } from "@/types/database";

export function AdminUserForm({ adminUser }: { adminUser?: AdminUser }) {
  const action = saveAdminUser.bind(null, adminUser?.id ?? null);
  const isEditing = Boolean(adminUser);

  return (
    <AdminActionForm action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <AdminFormField label="Full name">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={adminUser?.full_name ?? ""}
          maxLength={100}
          name="full_name"
          required
        />
      </AdminFormField>
      <AdminFormField label="Email address">
        <input
          autoComplete="off"
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={adminUser?.email ?? ""}
          name="email"
          required
          type="email"
        />
      </AdminFormField>
      <AdminFormField
        hint={isEditing ? "Leave blank to keep the current password." : "Use at least 8 characters."}
        label={isEditing ? "New password" : "Password"}
      >
        <input
          autoComplete="new-password"
          className="h-10 rounded-md border border-zinc-300 px-3"
          minLength={8}
          name="password"
          required={!isEditing}
          type="password"
        />
      </AdminFormField>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          {isEditing ? "Save admin user" : "Add admin user"}
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
