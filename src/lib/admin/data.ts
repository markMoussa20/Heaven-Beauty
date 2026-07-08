import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

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
