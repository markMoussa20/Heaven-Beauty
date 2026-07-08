import { createClient } from "@/lib/supabase/server";
import { getDisplayPrice } from "@/lib/pricing";
import type { CountryItemWithProduct } from "@/types/database";

export { getDisplayPrice };

export async function getFeaturedCountryItems(
  countryCode: string,
): Promise<CountryItemWithProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("country_items")
    .select(
      `
        *,
        products!inner(*, product_images(storage_path, sort_order)),
        countries!inner(*)
      `,
    )
    .eq("is_visible", true)
    .eq("is_featured", true)
    .eq("products.is_active", true)
    .eq("countries.is_active", true)
    .eq("countries.code", countryCode)
    .limit(8);

  if (error) {
    console.error("Failed to fetch featured products", error);
    return [];
  }

  return (data ?? []) as CountryItemWithProduct[];
}

export async function getVisibleCountryItems(
  countryCode: string,
): Promise<CountryItemWithProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("country_items")
    .select(
      `
        *,
        products!inner(*, product_images(storage_path, sort_order)),
        countries!inner(*)
      `,
    )
    .eq("is_visible", true)
    .eq("products.is_active", true)
    .eq("countries.is_active", true)
    .eq("countries.code", countryCode)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch shop products", error);
    return [];
  }

  return (data ?? []) as CountryItemWithProduct[];
}
