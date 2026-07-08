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

export const dynamic = "force-dynamic";

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
    <main className="bg-[#e6ecf4] pt-32 text-[#6c93c4]">
      <section className={`${shell} pb-12 pt-10 text-center`}>
        {page.subtitle ? (
          <p className="text-sm font-medium uppercase tracking-[0.28em]">
            {page.subtitle}
          </p>
        ) : null}
        <h1 className="mt-4 text-6xl font-medium leading-none sm:text-7xl">
          {page.title}
        </h1>
        {page.body ? (
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-8">
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
