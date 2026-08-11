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
  let { data, error } = await adminDb
    .from("admin_users")
    .select("id,user_id,email,is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  // Keep existing admins able to sign in while an application deployment and
  // its additive database migration are briefly out of sync.
  if (error?.code === "42703") {
    const legacyResult = await adminDb
      .from("admin_users")
      .select("id,user_id,email")
      .eq("user_id", user.id)
      .maybeSingle();
    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }

  if (error) {
    console.error("Admin session lookup failed", {
      code: error.code,
      message: error.message,
      userId: user.id,
    });
    return null;
  }
  const adminUser = data as { email?: string | null; is_active?: boolean } | null;

  if (!adminUser || adminUser.is_active === false) {
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
