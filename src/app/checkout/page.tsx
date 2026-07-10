import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import {
  getActiveCountries,
  getCountryByCode,
  getSelectedCountryCode,
} from "@/lib/country";
import { getDefaultCountryCode } from "@/lib/country/constants";
import { createClient } from "@/lib/supabase/server";
import type { ShippingZone } from "@/types/database";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  const selectedCountryCode = await getSelectedCountryCode();
  const [countries, selectedCountry] = await Promise.all([
    getActiveCountries(),
    getCountryByCode(selectedCountryCode),
  ]);
  const country =
    selectedCountry ??
    countries.find((item) => item.code === getDefaultCountryCode()) ??
    countries[0] ??
    null;

  if (!country) {
    return (
      <div className="bg-[#e6ecf4] px-4 py-20 text-center text-[#6c93c4]">
        <h1 className="text-4xl font-medium">Checkout is unavailable</h1>
        <p className="mt-4 text-sm">Add an active country before accepting orders.</p>
      </div>
    );
  }

  const shippingZones = country.use_shipping_zones
    ? await getShippingZones(country.id)
    : [];

  return <CheckoutClient country={country} shippingZones={shippingZones} />;
}

async function getShippingZones(countryId: string): Promise<ShippingZone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("*")
    .eq("country_id", countryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch checkout shipping zones", error);
    return [];
  }

  return (data ?? []) as ShippingZone[];
}
