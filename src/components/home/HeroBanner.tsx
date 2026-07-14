"use client";

import type { SiteContent } from "@/types/database";
import type {
  PointerEvent as ReactPointerEvent,
  TransitionEvent,
} from "react";
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
const MOBILE_DRAG_QUERY = "(max-width: 767px)";

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
    slideCount > 1
      ? [
          { imageUrl: heroImages[slideCount - 1], sourceIndex: slideCount - 1 },
          ...heroImages.map((imageUrl, sourceIndex) => ({
            imageUrl,
            sourceIndex,
          })),
          { imageUrl: heroImages[0], sourceIndex: 0 },
        ]
      : heroImages.map((imageUrl, sourceIndex) => ({ imageUrl, sourceIndex }));

  const [activeIndex, setActiveIndex] = useState(slideCount > 1 ? 1 : 0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragOffsetRef = useRef(0);
  const dragOriginX = useRef(0);
  const dragOriginY = useRef(0);
  const dragStartedAt = useRef(0);
  const dragStartIndex = useRef(activeIndex);
  const isTrackingPointer = useRef(false);
  const isDraggingRef = useRef(false);
  const trackingPointerId = useRef<number | null>(null);
  const slideWidth = useRef(0);

  useEffect(() => {
    if (isPaused || isDragging || slideCount <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev <= slideCount ? prev + 1 : prev));
    }, AUTOPLAY_DELAY_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDragging, isPaused, slideCount]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") {
      return;
    }

    if (activeIndex !== 0 && activeIndex !== slideCount + 1) return;

    setTransitionEnabled(false);
    setActiveIndex(activeIndex === 0 ? slideCount : 1);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTransitionEnabled(true));
    });
  };

  const isMobileViewport = () =>
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_DRAG_QUERY).matches;

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      slideCount <= 1 ||
      isMobileViewport() ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as HTMLElement).closest("a, button")
    ) {
      return;
    }

    dragOriginX.current = event.clientX;
    dragOriginY.current = event.clientY;
    dragStartedAt.current = performance.now();
    dragStartIndex.current = activeIndex;
    slideWidth.current = event.currentTarget.getBoundingClientRect().width;
    isTrackingPointer.current = true;
    isDraggingRef.current = false;
    trackingPointerId.current = event.pointerId;
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (isMobileViewport()) {
      return;
    }

    if (!isTrackingPointer.current || trackingPointerId.current !== event.pointerId) {
      return;
    }

    const nextOffset = event.clientX - dragOriginX.current;
    const verticalOffset = event.clientY - dragOriginY.current;

    if (!isDragging) {
      if (Math.abs(verticalOffset) > 8 && Math.abs(verticalOffset) > Math.abs(nextOffset)) {
        isTrackingPointer.current = false;
        isDraggingRef.current = false;
        trackingPointerId.current = null;
        return;
      }

      if (Math.abs(nextOffset) < 8 || Math.abs(nextOffset) < Math.abs(verticalOffset) * 1.2) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);
      setIsPaused(true);
      setTransitionEnabled(false);
    }

    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (isMobileViewport()) {
      isTrackingPointer.current = false;
      isDraggingRef.current = false;
      trackingPointerId.current = null;
      dragOffsetRef.current = 0;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    if (!isTrackingPointer.current || trackingPointerId.current !== event.pointerId) {
      return;
    }

    isTrackingPointer.current = false;
    trackingPointerId.current = null;

    if (!isDraggingRef.current) {
      setIsPaused(false);
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const elapsed = Math.max(performance.now() - dragStartedAt.current, 1);
    const velocity = dragOffsetRef.current / elapsed;
    const threshold = Math.min(slideWidth.current * 0.12, 80);
    let nextIndex = dragStartIndex.current;

    if (dragOffsetRef.current <= -threshold || velocity <= -0.45) {
      nextIndex = Math.min(dragStartIndex.current + 1, slideCount + 1);
    } else if (dragOffsetRef.current >= threshold || velocity >= 0.45) {
      nextIndex = Math.max(dragStartIndex.current - 1, 0);
    }

    dragOffsetRef.current = 0;
    isDraggingRef.current = false;
    setIsDragging(false);
    setTransitionEnabled(true);
    setDragOffset(0);
    setActiveIndex(nextIndex);
  };

  return (
    <section
      className={`relative h-[550px] touch-pan-y select-none overflow-hidden bg-[#e6ecf4] md:touch-pan-y ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerCancel={finishDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
    >
      <div
        className="hb-hero-track flex h-full"
        onTransitionEnd={handleTransitionEnd}
        style={{
          width: `${renderedSlides.length * 100}%`,
          transform: `translate3d(calc(-${(activeIndex * 100) / renderedSlides.length}% + ${dragOffset}px), 0, 0)`,
          transitionProperty: "transform",
          transitionDuration: transitionEnabled ? `${TRANSITION_MS}ms` : "0ms",
          transitionTimingFunction: "ease",
        }}
      >
        {renderedSlides.map(({ imageUrl, sourceIndex }, index) => {
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
