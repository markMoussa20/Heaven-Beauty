import { ProductCard } from "@/components/products/ProductCard";
import { sectionEyebrow, shell } from "@/lib/design";
import type { Country, CountryItemWithProduct } from "@/types/database";

type HeroBannerProps = {
  country: Country | null;
  deliveryText: string;
  featuredItem?: CountryItemWithProduct;
};

export function HeroBanner({
  country,
  deliveryText,
  featuredItem,
}: HeroBannerProps) {
  return (
    <section className="overflow-hidden bg-[#fbf6f3]">
      <div className={`${shell} grid gap-10 py-10 md:grid-cols-[1fr_0.86fr] md:items-center lg:py-14`}>
        <div className="max-w-2xl space-y-7">
          <p className={sectionEyebrow}>Heaven Beauty UAE</p>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight text-[#2b2523] sm:text-5xl lg:text-6xl">
              Beauty essentials for a soft, polished routine.
            </h1>
            <p className="max-w-xl text-base leading-8 text-[#6f625d] sm:text-lg">
              Discover Heaven Beauty favorites available in{" "}
              <span className="font-semibold text-[#2b2523]">
                {country?.name ?? "your country"}
              </span>
              , with local pricing, currency, and delivery rules already
              applied.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2b2523] px-7 font-semibold text-white shadow-sm transition hover:bg-[#463b36]"
              href="#featured-products"
            >
              Shop featured
            </a>
            <span className="inline-flex h-12 items-center justify-center rounded-full border border-[#e5d6cf] bg-white/70 px-5 font-medium text-[#6f625d]">
              {deliveryText}
            </span>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3 pt-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8b7167]">
            <span className="rounded-lg border border-[#eadbd4] bg-white/60 px-3 py-3">
              Authentic care
            </span>
            <span className="rounded-lg border border-[#eadbd4] bg-white/60 px-3 py-3">
              Local prices
            </span>
            <span className="rounded-lg border border-[#eadbd4] bg-white/60 px-3 py-3">
              Fast delivery
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -left-5 top-8 h-28 w-28 rounded-full bg-[#e9c7bd]/55 blur-2xl" />
          <div className="absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-[#d7c5aa]/40 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/55 p-4 shadow-[0_24px_80px_rgba(86,64,52,0.16)]">
            {featuredItem ? (
              <ProductCard item={featuredItem} featured />
            ) : (
              <div className="flex aspect-[4/5] flex-col justify-end rounded-[1.5rem] bg-[linear-gradient(145deg,#fff,#f0ded8)] p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b48a7b]">
                  New arrivals
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#2b2523]">
                  Curated beauty, ready for your country.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
