import "server-only";

import { toItemPricing, type CountryItemPriceRow } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { CountryItemWithProduct, ItemPricing } from "@/types/database";

type PricesRpcClient = {
  rpc: (
    name: "country_item_prices",
    args: { p_country_id: string },
  ) => PromiseLike<{
    data: CountryItemPriceRow[] | null;
    error: { code?: string; message: string } | null;
  }>;
};

/**
 * Current prices for every visible item in a country, keyed by country item id.
 * Fails soft: on any error (including the discounts migration not being applied
 * yet) it returns an empty map and items show their regular price.
 */
export async function getCountryItemPrices(countryId: string): Promise<Map<string, ItemPricing>> {
  // The hand-written Database type has no Functions entry for this RPC.
  const supabase = (await createClient()) as unknown as PricesRpcClient;
  const { data, error } = await supabase.rpc("country_item_prices", { p_country_id: countryId });

  if (error) {
    console.error("Failed to load country item prices; showing regular prices", {
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.country_item_id, toItemPricing(row)]));
}

/** Attaches current pricing to items that all belong to the same country. */
export async function withPricing(items: CountryItemWithProduct[]) {
  const countryId = items[0]?.country_id;
  if (!countryId) return items;

  const prices = await getCountryItemPrices(countryId);
  if (prices.size === 0) return items;

  return items.map((item) => {
    const pricing = prices.get(item.id);
    return pricing ? { ...item, pricing } : item;
  });
}
