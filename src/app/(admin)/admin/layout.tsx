import { AdminLayout } from "@/components/admin/AdminLayout";
import { requireAdmin } from "@/lib/admin/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return <AdminLayout email={session.email}>{children}</AdminLayout>;
}
