import { shell } from "@/lib/design";
import type { SiteContent } from "@/types/database";

type HeroBannerProps = {
  hero: SiteContent;
};

export function HeroBanner({
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
    </>
  );
}
