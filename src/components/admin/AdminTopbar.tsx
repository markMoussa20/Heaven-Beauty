import { logoutAdmin } from "@/lib/admin/actions";

export function AdminTopbar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:px-6">
      <div>
        <p className="text-sm font-semibold text-zinc-950">Admin Dashboard</p>
        <p className="text-xs text-zinc-500">{email}</p>
      </div>
      <form action={logoutAdmin}>
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          type="submit"
        >
          Logout
        </button>
      </form>
    </header>
  );
}
