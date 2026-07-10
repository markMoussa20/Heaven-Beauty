import { shell } from "@/lib/design";
import type { Country, SiteContent } from "@/types/database";

type HeroBannerProps = {
  country: Country | null;
  deliveryText: string;
  hero: SiteContent;
};

export function HeroBanner({
  country,
  deliveryText,
  hero,
}: HeroBannerProps) {
  const heroImages = [hero.image_url, hero.secondary_image_url].filter(Boolean);
  const title = hero.title || "Effortless Glow";
  const ctaLabel = hero.cta_label || "Shop All";
  const ctaHref = hero.cta_href || "#featured-products";

  return (
    <>
      <section className="relative h-[430px] overflow-hidden bg-white sm:h-[550px]">
        {heroImages.length > 0 ? (
          heroImages.map((imageUrl) => (
            <div
              className="hb-hero-image absolute inset-0 bg-cover bg-center"
              key={imageUrl}
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
          ))
        ) : (
          <div className="absolute inset-0 bg-[#dbe5f2]" />
        )}
        <div className="absolute inset-0 bg-white/5" />
        <div className={`${shell} relative z-10 flex h-full items-end pb-12 sm:pb-16`}>
          <div className="hb-fade-up flex flex-col items-start gap-4">
            <p className="text-2xl font-medium text-white drop-shadow-sm sm:text-4xl">
              {title}
            </p>
            <a
              className="inline-flex border border-white bg-white px-7 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#6c93c4] transition duration-300 hover:bg-transparent hover:text-white"
              href={ctaHref}
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#e6ecf4]">
        <div className={`${shell} grid min-h-[360px] gap-10 py-16 md:grid-cols-2 md:items-center`}>
          <h1 className="hb-fade-up text-5xl font-medium leading-[1.14] text-[#6c93c4] sm:text-6xl lg:text-7xl">
            Where Tint Meets Radiance
          </h1>
          <div className="hb-fade-up space-y-7 md:pl-12">
            <p className="max-w-lg text-xl font-light leading-10 text-[#6c93c4]">
              A touch of color designed to enhance your natural glow - soft,
              radiant, and effortlessly you.
            </p>
            <a
              className="inline-block border-b border-[#6c93c4] pb-1 text-lg font-medium uppercase tracking-wide text-[#6c93c4] transition hover:opacity-70"
              href="#our-story"
            >
              Our Story
            </a>
            <p className="max-w-md text-sm font-light leading-7 text-[#6c93c4]">
              Now shopping in {country?.name ?? "your country"} - Prices in{" "}
              {country?.currency_code ?? "AED"}. {deliveryText}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
