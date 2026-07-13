"use client";

import type { SiteContent } from "@/types/database";
import { useEffect, useRef, useState } from "react";

type HeroBannerProps = {
  hero: SiteContent;
};

// Mirrors the original site's Elementor/Swiper hero: horizontal slide
// transition, autoplay, pauses on hover/interaction, loops, and only
// the first slide carries the heading + CTA (the rest are image-only).
// Note: the original has no visible pagination dots or nav arrows at all
// (Swiper's pagination module is loaded but never attached to a DOM
// element), so this doesn't render any either.
const AUTOPLAY_DELAY_MS = 4000;
const TRANSITION_MS = 2400;

export function HeroBanner({ hero }: HeroBannerProps) {
  const heroImages = [
    hero.image_url,
    hero.secondary_image_url,
    ...(hero.gallery_image_urls ?? []),
  ].filter((imageUrl, index, images): imageUrl is string =>
    Boolean(imageUrl) && images.indexOf(imageUrl) === index,
  );
  const title = hero.title || "Effortless Glow";
  const ctaLabel = hero.cta_label || "Shop All";
  const ctaHref = hero.cta_href || "#featured-products";
  const slideCount = heroImages.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, AUTOPLAY_DELAY_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, slideCount]);

  if (slideCount === 0) {
    return (
      <section className="hb-hero-fallback relative h-[430px] overflow-hidden bg-[#e6ecf4] sm:h-[560px] lg:h-[720px] xl:h-[760px]" />
    );
  }

  return (
    <section
      className="relative h-[430px] overflow-hidden bg-[#e6ecf4] sm:h-[560px] lg:h-[720px] xl:h-[760px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="hb-hero-track flex h-full"
        style={{
          width: `${slideCount * 100}%`,
          transform: `translateX(-${(activeIndex * 100) / slideCount}%)`,
          transitionProperty: "transform",
          transitionDuration: `${TRANSITION_MS}ms`,
          transitionTimingFunction: "ease-out",
        }}
      >
        {heroImages.map((imageUrl, index) => (
          <div
            className="relative h-full shrink-0 bg-cover bg-center"
            key={imageUrl}
            style={{
              width: `${100 / slideCount}%`,
              backgroundImage: `url('${imageUrl}')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-white/5" />
            {index === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center px-6 sm:px-12 lg:px-16">
                <div
                  className={`flex max-w-[66%] flex-col items-start gap-6 text-left [text-shadow:0_0_10px_rgba(0,0,0,0.3)] ${
                    activeIndex === 0 ? "hb-hero-copy-enter" : "opacity-0"
                  }`}
                  key={activeIndex === 0 ? "visible" : "hidden"}
                >
                  <p className="font-heading text-[35px] font-light leading-[1.4] text-white lg:text-[51px]">
                    {title}
                  </p>
                  <a
                    className="pointer-events-auto inline-flex border-2 border-white bg-transparent px-5 py-4 text-xs font-normal text-white transition duration-300 hover:bg-white hover:text-[#6c93c4] lg:text-sm"
                    href={ctaHref}
                  >
                    {ctaLabel}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
