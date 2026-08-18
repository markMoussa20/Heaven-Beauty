import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/types/database";

export type AdminRow = Record<string, unknown> & { id: string };

export async function listRows(
  table: string,
  options: {
    order?: string;
    ascending?: boolean;
    search?: string;
    searchColumns?: string[];
    filters?: Record<string, string | undefined>;
    select?: string;
    /** Inclusive calendar dates (YYYY-MM-DD) applied to created_at. */
    from?: string;
    to?: string;
  } = {},
) {
  const supabase = createAdminClient();
  let query = supabase
    .from(table)
    .select(options.select ?? "*")
    .limit(200);

  for (const [column, value] of Object.entries(options.filters ?? {})) {
    if (value) {
      query = query.eq(column, value);
    }
  }

  if (options.from) {
    query = query.gte("created_at", `${options.from}T00:00:00.000Z`);
  }

  if (options.to) {
    const end = new Date(`${options.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  if (options.search && options.searchColumns?.length) {
    query = query.or(
      options.searchColumns
        .map((column) => `${column}.ilike.%${options.search}%`)
        .join(","),
    );
  }

  if (options.order) {
    query = query.order(options.order, {
      ascending: options.ascending ?? true,
    });
  }

  const { data, error } = await query;

  if (error) {
    return { data: [] as AdminRow[], error: error.message };
  }

  return { data: (data ?? []) as AdminRow[], error: null };
}

export async function getRow(table: string, id: string, select = "*") {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .maybeSingle();

  return {
    data: data as AdminRow | null,
    error: error?.message ?? null,
  };
}

export async function getOptions(table: string, labelColumn = "name") {
  const { data } = await listRows(table, { order: labelColumn });

  return data.map((row) => ({
    label: String(row[labelColumn] ?? row.id),
    value: row.id,
  }));
}

export async function listAdminUsers(search?: string) {
  const supabase = createAdminClient();
  const [{ data: rows, error: rowsError }, { data: authData, error: authError }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id,user_id,email,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (rowsError) return { data: [] as AdminUser[], error: rowsError.message };

  const authUsers = new Map(
    (authData?.users ?? []).map((user) => [
      user.id,
      {
        email: user.email ?? null,
        fullName: typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      },
    ]),
  );
  const adminUsers = ((rows ?? []) as AdminUser[]).map((row) => {
    const authUser = row.user_id ? authUsers.get(row.user_id) : undefined;
    return {
      ...row,
      email: authUser?.email ?? row.email,
      full_name: authUser?.fullName ?? null,
    };
  });
  const query = search?.trim().toLowerCase();
  const filtered = query
    ? adminUsers.filter((user) =>
        [user.full_name, user.email].some((value) => value?.toLowerCase().includes(query)),
      )
    : adminUsers;

  return {
    data: filtered,
    error: authError ? "Admin profiles could not be loaded from authentication." : null,
  };
}
