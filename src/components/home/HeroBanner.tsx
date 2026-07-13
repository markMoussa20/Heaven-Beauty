"use client";

import type { SiteContent } from "@/types/database";
import type { TransitionEvent } from "react";
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
const AUTOPLAY_DELAY_MS = 2000;
const TRANSITION_MS = 500;
const ORIGINAL_HERO_IMAGES = [
  "/images/original-home-hero-1.jpeg",
  "/images/original-home-hero-2.jpeg",
  "/images/original-home-hero-3.webp",
];

export function HeroBanner({ hero }: HeroBannerProps) {
  const configuredImages = [
    hero.image_url,
    hero.secondary_image_url,
    ...(hero.gallery_image_urls ?? []),
  ].filter((imageUrl, index, images): imageUrl is string =>
    Boolean(imageUrl) && images.indexOf(imageUrl) === index,
  );
  const heroImages =
    configuredImages.length > 0 ? configuredImages : ORIGINAL_HERO_IMAGES;
  const title = hero.title || "Effortless Glow";
  const ctaLabel = hero.cta_label || "Shop All";
  const ctaHref = hero.cta_href || "#featured-products";
  const slideCount = heroImages.length;
  const renderedSlides =
    slideCount > 1 ? [...heroImages, heroImages[0]] : heroImages;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev < slideCount ? prev + 1 : prev));
    }, AUTOPLAY_DELAY_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, slideCount]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") {
      return;
    }

    if (activeIndex !== slideCount) return;

    setTransitionEnabled(false);
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true));
    });
  };

  return (
    <section
      className="relative h-[550px] overflow-hidden bg-[#e6ecf4]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="hb-hero-track flex h-full"
        onTransitionEnd={handleTransitionEnd}
        style={{
          width: `${renderedSlides.length * 100}%`,
          transform: `translateX(-${(activeIndex * 100) / renderedSlides.length}%)`,
          transitionProperty: "transform",
          transitionDuration: transitionEnabled ? `${TRANSITION_MS}ms` : "0ms",
          transitionTimingFunction: "ease",
        }}
      >
        {renderedSlides.map((imageUrl, index) => {
          const sourceIndex = index % slideCount;
          const isActive = activeIndex === index;

          return (
          <div
            className="relative h-full shrink-0 bg-cover bg-center"
            key={`${imageUrl}-${index}`}
            style={{
              width: `${100 / renderedSlides.length}%`,
              backgroundImage: `url('${imageUrl}')`,
            }}
          >
            {sourceIndex === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center px-[30px] md:px-[50px]">
                <div
                  className={`flex max-w-[66%] flex-col items-start gap-[30px] text-left [text-shadow:0_0_10px_rgba(0,0,0,0.3)] ${
                    isActive ? "hb-hero-copy-enter" : "opacity-0"
                  }`}
                  key={isActive ? `visible-${activeIndex}` : `hidden-${index}`}
                >
                  <p className="font-heading text-[35px] font-light leading-[1.4] text-white lg:text-[51px]">
                    {title}
                  </p>
                  <a
                    className="pointer-events-auto inline-flex border-2 border-white bg-transparent px-5 py-[15px] text-xs font-normal leading-[1.2] text-white transition duration-300 hover:bg-white hover:text-[#6c93c4] md:py-4 md:text-sm"
                    href={ctaHref}
                  >
                    {ctaLabel}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
          );
        })}
      </div>
    </section>
  );
}
