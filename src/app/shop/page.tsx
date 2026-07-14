import { ShopCatalog } from "@/components/products/ShopCatalog";
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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const searchQuery = q.trim().toLowerCase();
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
  const visibleProducts = searchQuery
    ? products.filter((item) => {
        const product = item.products;
        return [product.name, product.brand, product.short_description, product.description]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(searchQuery));
      })
    : products;

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
        {searchQuery ? (
          <p className="mt-4 text-sm font-light text-[#6c93c4]">
            {visibleProducts.length} result{visibleProducts.length === 1 ? "" : "s"} for &ldquo;{q.trim()}&rdquo;
          </p>
        ) : null}
      </section>
      <section className={`${shell} pb-20`}>
        <ShopCatalog
          items={visibleProducts}
          selectedCountryName={country?.name ?? selectedCountryCode}
        />
      </section>
    </main>
  );
}
