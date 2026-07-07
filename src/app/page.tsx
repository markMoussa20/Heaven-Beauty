import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductCard } from "@/components/products/ProductCard";
import { sectionEyebrow, shell } from "@/lib/design";
import {
  getActiveCountries,
  getCountryByCode,
  getSelectedCountryCode,
} from "@/lib/country";
import { getDefaultCountryCode } from "@/lib/country/constants";
import { getFeaturedCountryItems } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function Page() {
  const selectedCountryCode = await getSelectedCountryCode();
  const [countries, selectedCountry, featuredItems] = await Promise.all([
    getActiveCountries(),
    getCountryByCode(selectedCountryCode),
    getFeaturedCountryItems(selectedCountryCode),
  ]);
  const country =
    selectedCountry ??
    countries.find((item) => item.code === getDefaultCountryCode()) ??
    countries[0] ??
    null;
  const deliveryText = country
    ? country.use_shipping_zones
      ? "Delivery fee is calculated by area at checkout."
      : `Delivery ${country.currency_symbol}${country.global_delivery_fee ?? 0}`
    : "Select a country to see local delivery.";

  return (
    <div className="bg-[#fbf6f3]">
      <HeroBanner
        country={country}
        deliveryText={deliveryText}
        featuredItem={featuredItems[0]}
      />

      <section className="border-y border-[#eadbd4] bg-white">
        <div className={`${shell} grid gap-4 py-5 text-sm font-medium text-[#6f625d] sm:grid-cols-3`}>
          <p>
            <span className="font-semibold text-[#2b2523]">
              {country?.currency_code ?? "AED"}
            </span>{" "}
            pricing is active.
          </p>
          <p>{deliveryText}</p>
          <p>Featured items come from visible country inventory.</p>
        </div>
      </section>

      <section id="featured-products" className={`${shell} py-12 lg:py-16`}>
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={sectionEyebrow}>
              Featured products
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#2b2523]">
              Available in {country?.name ?? selectedCountryCode}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#7a6b65]">
            Only visible country items with active products are shown here.
          </p>
        </div>

        {featuredItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#d8b7a9] bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-[#2b2523]">
              No featured products yet
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#7a6b65]">
              Add visible featured country items for{" "}
              {country?.name ?? "the selected country"} in Supabase to populate
              this section.
            </p>
          </div>
        )}
      </section>

      <section className="bg-white">
        <div className={`${shell} grid gap-6 py-12 md:grid-cols-3`}>
          <div className="rounded-[1.25rem] bg-[#f8eee9] p-6">
            <p className={sectionEyebrow}>01</p>
            <h3 className="mt-3 text-lg font-semibold text-[#2b2523]">
              Choose your country
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6b65]">
              The storefront remembers your country using local storage and a
              cookie.
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-[#f8eee9] p-6">
            <p className={sectionEyebrow}>02</p>
            <h3 className="mt-3 text-lg font-semibold text-[#2b2523]">
              See local pricing
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6b65]">
              Prices are read from country items, not directly from products.
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-[#f8eee9] p-6">
            <p className={sectionEyebrow}>03</p>
            <h3 className="mt-3 text-lg font-semibold text-[#2b2523]">
              Delivery follows rules
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6b65]">
              Countries can use a global delivery fee or area-based zones.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
