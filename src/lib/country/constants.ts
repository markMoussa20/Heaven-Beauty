export const COUNTRY_STORAGE_KEY = "heaven_beauty_country";
export const COUNTRY_COOKIE_KEY = "hb-country";

export function getDefaultCountryCode() {
  return process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "AE";
}
