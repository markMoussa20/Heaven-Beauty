import { cookies, headers } from "next/headers";

import { COUNTRY_COOKIE_KEY, getDefaultCountryCode } from "@/lib/country/constants";
import { createClient } from "@/lib/supabase/server";
import type { Country } from "@/types/database";

export async function getSelectedCountryCode() {
  const countries = await getActiveCountries();
  if (countries.length === 0) return getDefaultCountryCode();

  const requestHeaders = await headers();
  const hostname = normalizeDomain(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
  const hostnameCountry = countries.find(
    (country) => normalizeDomain(country.domain) === hostname,
  );

  if (hostnameCountry) return hostnameCountry.code;

  const cookieStore = await cookies();
  const manualCountryCode = cookieStore
    .get(COUNTRY_COOKIE_KEY)
    ?.value.toUpperCase();

  const cookieCountry = countries.find((country) => country.code === manualCountryCode);
  if (cookieCountry) return cookieCountry.code;

  const detectedCountryCode = await getDetectedCountryCode(countries);
  if (detectedCountryCode) return detectedCountryCode;

  const defaultCode = getDefaultCountryCode().toUpperCase();
  return (
    countries.find((country) => country.code === defaultCode)?.code ??
    countries[0]?.code ?? defaultCode
  );
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

async function getDetectedCountryCode(countries: Country[]) {
  const requestHeaders = await headers();
  const geoCountry =
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("x-country-code") ||
    requestHeaders.get("x-geo-country");

  if (!geoCountry) {
    return null;
  }

  const normalizedCountry = geoCountry.toUpperCase();
  return (
    countries.find(
      (country) =>
        country.iso2?.toUpperCase() === normalizedCountry ||
        country.code.toUpperCase() === normalizedCountry,
    )?.code ?? null
  );
}

export function normalizeDomain(value: string | null | undefined) {
  if (!value) return "";
  const candidate = value.trim().toLowerCase();
  try {
    const url = new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    );
    return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return candidate
      .replace(/^[a-z]+:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  }
}
