import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/admin/auth";

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Heaven Beauty Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950">Login</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in with Supabase Auth. Access is allowed only for users listed in
          public.admin_users.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
