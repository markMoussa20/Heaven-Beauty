import "server-only";

import { redirect } from "next/navigation";

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

  const { data } = await supabase
    .from("admin_users")
    .select("id,user_id,email")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .maybeSingle();
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
