import { HeroBanner } from "@/components/home/HeroBanner";
import { ScrollTranslateY } from "@/components/home/ScrollTranslateY";
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
  const showcaseImageUrl = homeContent.imageShowcase.image_url;
  const pureIntroImageUrl =
    homeContent.pureIntro.image_url ??
    homeContent.pureIntro.secondary_image_url ??
    homeContent.imageShowcase.image_url;
  const storyImageUrl = homeContent.story.image_url;
  const differenceImageUrl = homeContent.difference.image_url;

  return (
    <div className="bg-[#e6ecf4] text-[#6c93c4]">
      <HeroBanner hero={homeContent.hero} />

      {homeContent.tintRadiance.is_active ? (
        <section className="bg-[#e6ecf4]">
          <div
            className={`${shell} grid gap-10 py-[100px] md:grid-cols-2 md:items-center lg:py-[135px]`}
          >
            <h2 className="text-[32px] font-normal leading-[1.3] text-[#6c93c4] lg:text-[40px]">
              {homeContent.tintRadiance.title}
            </h2>
            <div className="max-w-2xl space-y-8">
              {homeContent.tintRadiance.body ? (
                <p className="text-base font-light leading-7 text-[#6c93c4]">
                  {homeContent.tintRadiance.body}
                </p>
              ) : null}
              {homeContent.tintRadiance.cta_label &&
              homeContent.tintRadiance.cta_href ? (
                <a
                  className="inline-block text-base font-normal uppercase tracking-wide text-[#6c93c4] underline"
                  href={homeContent.tintRadiance.cta_href}
                >
                  {homeContent.tintRadiance.cta_label}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section id="featured-products" className={`${shell} py-8 lg:py-12`}>
        <ProductGrid
          items={featuredItems}
          selectedCountryName={country?.name ?? selectedCountryCode}
        />
      </section>

      {showcaseImageUrl ? (
      <section className="bg-[#e6ecf4] px-5 pb-[30px] pt-[60px] md:px-[30px] md:pb-20 md:pt-20 lg:mb-[200px] lg:px-[30px] lg:pb-[25px] lg:pt-[160px]">
        <div className="mx-auto max-w-[1029px]">
          <ScrollTranslateY maxPixels={100}>
            <h2 className="text-[23px] font-normal leading-[1.2] text-[#6c93c4] md:text-[33px] md:leading-[1.1] lg:text-[60px] lg:leading-[1.15]">
              {homeContent.imageShowcase.title}
            </h2>
          </ScrollTranslateY>
          <div
            aria-label={homeContent.imageShowcase.image_alt ?? undefined}
            className="mx-auto mt-10 hidden aspect-[218/272] w-[218px] rotate-[10deg] bg-cover bg-center md:block lg:mt-[-37px]"
            style={{ backgroundImage: `url('${showcaseImageUrl}')` }}
          />
        </div>
      </section>
      ) : null}

      <section className="bg-[#e6ecf4] px-5 py-20 md:px-8 lg:mb-[220px] lg:px-[30px] lg:py-0">
        <div className="mx-auto grid w-full max-w-[1260px] gap-10 lg:grid-cols-[minmax(0,63fr)_minmax(0,37fr)] lg:gap-0">
          {pureIntroImageUrl ? (
            <div
              aria-label={homeContent.pureIntro.image_alt ?? undefined}
              className="aspect-[4/5] w-full bg-cover bg-center lg:w-[calc(100%-24px)] lg:-translate-x-7"
              role={homeContent.pureIntro.image_alt ? "img" : undefined}
              style={{ backgroundImage: `url('${pureIntroImageUrl}')` }}
            />
          ) : null}
          <div className="w-full lg:pt-[150px]">
            <ScrollTranslateY maxPixels={70}>
              <h2 className="text-[40px] font-normal leading-[1.15] text-[#6c93c4] md:text-[44px] lg:whitespace-nowrap">
                {homeContent.pureIntro.title}
              </h2>
            </ScrollTranslateY>
            <h3 className="mt-10 text-[26px] font-normal leading-[1.3] text-[#6c93c4] md:text-[28px]">
              {homeContent.pureIntro.subtitle}
            </h3>
            <p className="mt-[52px] text-[16px] font-light leading-[1.6] text-[#6c93c4]">
              {homeContent.pureIntro.body}
            </p>
            {homeContent.pureIntro.cta_label &&
            homeContent.pureIntro.cta_href ? (
              <a
                className="mt-[68px] inline-flex min-h-[46px] min-w-[70px] items-center justify-center bg-[#aac2e4] px-5 py-[15px] text-[13px] font-medium leading-[1.2] text-white transition duration-300 hover:bg-[#98b5dd]"
                href={homeContent.pureIntro.cta_href}
              >
                {homeContent.pureIntro.cta_label}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="home-story-section"
        id="our-story"
      >
        {storyImageUrl ? (
          <div className="home-story-media">
            <div
              aria-label={homeContent.story.image_alt ?? "Heaven Beauty model"}
              className="home-story-image"
              role="img"
              style={{ backgroundImage: `url('${storyImageUrl}')` }}
            />
          </div>
        ) : null}
        <div className="home-story-content">
          <div className="home-story-inner">
            <h3 className="home-story-title">
              {homeContent.story.title}
            </h3>
            <p className="home-story-body">
              {homeContent.story.body}
            </p>
            {homeContent.story.cta_label && homeContent.story.cta_href ? (
              <div className="home-story-cta-row">
                <a
                  className="home-story-cta"
                  href={homeContent.story.cta_href}
                >
                  {homeContent.story.cta_label}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="home-difference-section">
        {differenceImageUrl ? (
          <div className="home-difference-media">
            <div
              aria-label={
                homeContent.difference.image_alt ??
                "Heaven Beauty model holding a tint"
              }
              className="home-difference-image"
              role="img"
              style={{ backgroundImage: `url('${differenceImageUrl}')` }}
            />
          </div>
        ) : null}
        <div className="home-difference-content">
          <div className="home-difference-inner">
            <h3 className="home-difference-title">
              {homeContent.difference.title}
            </h3>
            <p className="home-difference-body">
              {homeContent.difference.body}
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
