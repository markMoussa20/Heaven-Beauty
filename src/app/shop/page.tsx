import { ProductGrid } from "@/components/products/ProductGrid";
import { shell } from "@/lib/design";
import {
  getActiveCountries,
  getCountryByCode,
  getSelectedCountryCode,
} from "@/lib/country";
import { getDefaultCountryCode } from "@/lib/country/constants";
import { getPublicPage } from "@/lib/public-pages";
import { getVisibleCountryItems } from "@/lib/products";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage() {
  const selectedCountryCode = await getSelectedCountryCode();
  const [countries, selectedCountry, page, products] = await Promise.all([
    getActiveCountries(),
    getCountryByCode(selectedCountryCode),
    getPublicPage("shop"),
    getVisibleCountryItems(selectedCountryCode),
  ]);
  const country =
    selectedCountry ??
    countries.find((item) => item.code === getDefaultCountryCode()) ??
    countries[0] ??
    null;

  return (
    <main className="bg-[#e6ecf4] pt-8 md:pt-32 text-[#6c93c4]">
      <section className={`${shell} pb-10 pt-8 text-center sm:pb-12 sm:pt-10`}>
        {page.subtitle ? (
          <p className="text-sm font-medium uppercase tracking-[0.28em]">
            {page.subtitle}
          </p>
        ) : null}
        <h1 className="mt-3 text-[2.7rem] font-medium leading-[1.05] sm:mt-4 sm:text-7xl">
          {page.title}
        </h1>
        {page.body ? (
          <p className="mx-auto mt-4 max-w-2xl text-base font-light leading-7 sm:mt-6 sm:text-lg sm:leading-8">
            {page.body}
          </p>
        ) : null}
      </section>
      <section className={`${shell} pb-20`}>
        <ProductGrid
          items={products}
          selectedCountryName={country?.name ?? selectedCountryCode}
        />
      </section>
    </main>
  );
}
