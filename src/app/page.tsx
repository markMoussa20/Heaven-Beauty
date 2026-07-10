import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductGrid } from "@/components/products/ProductGrid";
import { shell } from "@/lib/design";
import {
  getActiveCountries,
  getCountryByCode,
  getSelectedCountryCode,
} from "@/lib/country";
import { getDefaultCountryCode } from "@/lib/country/constants";
import { getFeaturedCountryItems } from "@/lib/products";
import { getHomeContent } from "@/lib/site-content";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Home",
};

export default async function Page() {
  const selectedCountryCode = await getSelectedCountryCode();
  const [countries, selectedCountry, featuredItems, homeContent] = await Promise.all([
    getActiveCountries(),
    getCountryByCode(selectedCountryCode),
    getFeaturedCountryItems(selectedCountryCode),
    getHomeContent(),
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
  const showcaseImageUrl = homeContent.imageShowcase.image_url;
  const showcaseSecondImageUrl = homeContent.imageShowcase.secondary_image_url;

  return (
    <div className="bg-[#e6ecf4] text-[#6c93c4]">
      <HeroBanner
        country={country}
        deliveryText={deliveryText}
        hero={homeContent.hero}
      />

      <section id="featured-products" className={`${shell} py-8 lg:py-12`}>
        <ProductGrid
          items={featuredItems}
          selectedCountryName={country?.name ?? selectedCountryCode}
        />
      </section>

      {homeContent.tintRadiance.is_active ? (
        <section className="bg-[#e6ecf4]">
          <div
            className={`${shell} grid min-h-[520px] gap-10 py-20 md:grid-cols-2 md:items-center lg:py-28`}
          >
            <h2 className="text-5xl font-medium leading-tight text-[#7f9dd0] sm:text-6xl">
              {homeContent.tintRadiance.title}
            </h2>
            <div className="max-w-2xl space-y-10">
              {homeContent.tintRadiance.body ? (
                <p className="text-xl font-light leading-9 text-[#6c93c4]">
                  {homeContent.tintRadiance.body}
                </p>
              ) : null}
              {homeContent.tintRadiance.cta_label &&
              homeContent.tintRadiance.cta_href ? (
                <a
                  className="inline-block border-b border-[#6c93c4] pb-1 text-sm font-medium uppercase tracking-wide text-[#6c93c4]"
                  href={homeContent.tintRadiance.cta_href}
                >
                  {homeContent.tintRadiance.cta_label}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-[#e6ecf4]">
        <div className={`${shell} py-14 lg:py-20`}>
          <h2 className="mx-auto max-w-5xl text-center text-5xl font-medium leading-tight text-[#6c93c4] sm:text-6xl">
            {homeContent.imageShowcase.title}
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div
              className="min-h-[420px] rotate-[-4deg] bg-cover bg-center shadow-none"
              aria-label={homeContent.imageShowcase.image_alt ?? undefined}
              style={{
                backgroundImage: `url('${showcaseImageUrl}')`,
              }}
            />
            <div
              className="min-h-[420px] rotate-[5deg] bg-cover bg-center shadow-none"
              aria-label={
                homeContent.imageShowcase.secondary_image_alt ?? undefined
              }
              style={{
                backgroundImage: `url('${showcaseSecondImageUrl}')`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#e6ecf4]">
        <div className={`${shell} grid min-h-[680px] gap-8 py-12 md:grid-cols-2 md:items-start`}>
          <div className="hidden md:block" />
          <div className="max-w-lg space-y-10 md:pt-8">
            <div>
              <h2 className="text-4xl font-medium text-[#6c93c4]">
                {homeContent.pureIntro.title}
              </h2>
              <h3 className="mt-8 text-3xl font-medium text-[#6c93c4]">
                {homeContent.pureIntro.subtitle}
              </h3>
            </div>
            <p className="text-lg font-light leading-9 text-[#6c93c4]">
              {homeContent.pureIntro.body}
            </p>
            {homeContent.pureIntro.cta_label &&
            homeContent.pureIntro.cta_href ? (
              <a
                className="inline-flex bg-[#9eb9d9] px-7 py-4 text-sm font-medium text-white transition duration-300 hover:bg-[#6c93c4]"
                href={homeContent.pureIntro.cta_href}
              >
                {homeContent.pureIntro.cta_label}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section id="our-story" className="bg-[#e6ecf4]">
        <div className={`${shell} grid gap-10 py-16 md:grid-cols-2`}>
          <div className="space-y-6">
            <h3 className="text-3xl font-medium text-[#6c93c4]">
              {homeContent.story.title}
            </h3>
            <p className="text-base font-light leading-8 text-[#6c93c4]">
              {homeContent.story.body}
            </p>
            {homeContent.story.cta_label && homeContent.story.cta_href ? (
              <a
                className="inline-block border-b border-[#6c93c4] pb-1 text-sm font-medium uppercase tracking-wide text-[#6c93c4]"
                href={homeContent.story.cta_href}
              >
                {homeContent.story.cta_label}
              </a>
            ) : null}
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-medium text-[#6c93c4]">
              {homeContent.difference.title}
            </h3>
            <p className="text-base font-light leading-8 text-[#6c93c4]">
              {homeContent.difference.body}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#e6ecf4] py-5 text-[#6c93c4]">
        <div className="whitespace-nowrap text-2xl font-medium tracking-wide">
          <span className="inline-block animate-[hb-ken-burns_20s_linear_infinite_alternate]">
            {homeContent.marquee.marquee_text}
          </span>
        </div>
      </section>
    </div>
  );
}
