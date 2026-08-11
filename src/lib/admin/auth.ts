import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  email: string;
  userId: string;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("admin_users")
    .select("id,user_id,email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin session lookup failed", {
      code: error.code,
      message: error.message,
      userId: user.id,
    });
    return null;
  }
  const adminUser = data as { email?: string | null } | null;

  if (!adminUser) {
    return null;
  }

  return {
    email: user.email ?? adminUser.email ?? "admin",
    userId: user.id,
  };
}

export async function requireAdmin() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
