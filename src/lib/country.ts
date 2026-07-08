import { cookies, headers } from "next/headers";

import { COUNTRY_COOKIE_KEY, getDefaultCountryCode } from "@/lib/country/constants";
import { createClient } from "@/lib/supabase/server";
import type { Country } from "@/types/database";

export async function getSelectedCountryCode() {
  const cookieStore = await cookies();
  const manualCountryCode = cookieStore.get(COUNTRY_COOKIE_KEY)?.value;

  if (manualCountryCode) {
    return manualCountryCode;
  }

  const detectedCountryCode = await getDetectedCountryCode();
  return detectedCountryCode || getDefaultCountryCode();
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

async function getDetectedCountryCode() {
  const requestHeaders = await headers();
  const geoCountry =
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("x-country-code") ||
    requestHeaders.get("x-geo-country");

  if (!geoCountry) {
    return null;
  }

  const supabase = await createClient();
  const normalizedCountry = geoCountry.toUpperCase();
  const { data, error } = await supabase
    .from("countries")
    .select("code")
    .or(`iso2.eq.${normalizedCountry},code.eq.${normalizedCountry}`)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to detect country from IP headers", error);
    return null;
  }

  return (data as { code?: string } | null)?.code ?? null;
}
