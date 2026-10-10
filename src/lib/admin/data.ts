import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser, Country, Discount, PromoBanner } from "@/types/database";

export type AdminPromoBanner = PromoBanner & { country_ids: string[] };

export async function listPromoBanners() {
  const supabase = createAdminClient();
  const [banners, countries] = await Promise.all([
    supabase
      .from("promo_banners")
      .select("*, promo_banner_countries(country_id)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("countries").select("*").order("name"),
  ]);

  const rows = (banners.data ?? []) as unknown as (PromoBanner & {
    promo_banner_countries: { country_id: string }[] | null;
  })[];

  return {
    banners: rows.map(({ promo_banner_countries: links, ...banner }) => ({
      ...banner,
      country_ids: (links ?? []).map((link) => link.country_id),
    })) as AdminPromoBanner[],
    countries: (countries.data ?? []) as Country[],
    error: banners.error?.message ?? countries.error?.message ?? null,
  };
}

export type AdminDiscount = Discount & { category_ids: string[]; country_item_ids: string[] };
export type DiscountItemOption = { id: string; country_id: string; label: string };
export type DiscountCategoryOption = { id: string; name: string; parent_id: string | null };

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

export async function listDiscounts() {
  const supabase = createAdminClient();
  const [discounts, countries, categories, countryItems] = await Promise.all([
    supabase
      .from("discounts")
      .select("*, discount_categories(category_id), discount_items(country_item_id)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("countries").select("*").order("name"),
    supabase.from("categories").select("id,name,parent_id").order("sort_order").order("name"),
    supabase
      .from("country_items")
      .select("id,country_id,country_sku,products!inner(name,base_sku)")
      .order("sort_order"),
  ]);

  const rows = (discounts.data ?? []) as unknown as (Discount & {
    discount_categories: { category_id: string }[] | null;
    discount_items: { country_item_id: string }[] | null;
  })[];
  const itemRows = (countryItems.data ?? []) as unknown as {
    id: string;
    country_id: string;
    country_sku: string | null;
    products: { name: string; base_sku: string | null } | null;
  }[];

  return {
    discounts: rows.map(({ discount_categories: categoryLinks, discount_items: itemLinks, ...discount }) => ({
      ...discount,
      category_ids: (categoryLinks ?? []).map((link) => link.category_id),
      country_item_ids: (itemLinks ?? []).map((link) => link.country_item_id),
    })) as AdminDiscount[],
    countries: (countries.data ?? []) as Country[],
    categories: (categories.data ?? []) as DiscountCategoryOption[],
    countryItems: itemRows.map((item) => {
      const sku = item.country_sku || item.products?.base_sku;
      return {
        id: item.id,
        country_id: item.country_id,
        label: `${item.products?.name ?? item.id}${sku ? ` · ${sku}` : ""}`,
      };
    }) as DiscountItemOption[],
    error:
      discounts.error?.message ?? countries.error?.message ?? categories.error?.message ?? countryItems.error?.message ?? null,
    missingMigration: Boolean(discounts.error?.code && MISSING_TABLE_CODES.has(discounts.error.code)),
  };
}

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
