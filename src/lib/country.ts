import { cookies } from "next/headers";

import { COUNTRY_COOKIE_KEY, getDefaultCountryCode } from "@/lib/country/constants";
import { createClient } from "@/lib/supabase/server";
import type { Country } from "@/types/database";

export async function getSelectedCountryCode() {
  const cookieStore = await cookies();
  return cookieStore.get(COUNTRY_COOKIE_KEY)?.value || getDefaultCountryCode();
}

export async function getActiveCountries(): Promise<Country[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch countries", error);
    return [];
  }

  return data ?? [];
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch selected country", error);
    return null;
  }

  return data;
}
