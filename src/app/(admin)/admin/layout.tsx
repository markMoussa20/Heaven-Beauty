import { AdminLayout } from "@/components/admin/AdminLayout";
import { requireAdmin } from "@/lib/admin/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s - Admin - Heaven Beauty",
  },
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return <AdminLayout email={session.email}>{children}</AdminLayout>;
}
