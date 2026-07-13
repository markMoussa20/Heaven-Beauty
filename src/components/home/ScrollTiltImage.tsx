"use client";

import { useEffect, useRef } from "react";

// Mirrors the original site's Elementor "motion effects" scroll-linked
// rotation on the image showcase: the tilt angle changes continuously as
// the element moves through the viewport while scrolling.
export function ScrollTiltImage({
  imageUrl,
  alt,
  maxDegrees = 14,
  className = "min-h-[420px]",
}: {
  imageUrl: string;
  alt?: string;
  maxDegrees?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      // Progress: -1 when element is below viewport, 0 at center, 1 when above.
      const center = rect.top + rect.height / 2;
      const progress = (viewportHeight / 2 - center) / (viewportHeight / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      el.style.transform = `rotateZ(${(clamped * maxDegrees).toFixed(2)}deg)`;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [maxDegrees]);

  return (
    <div
      aria-label={alt}
      className={`${className} bg-cover bg-center shadow-none [transition:transform_100ms_linear] motion-reduce:transform-none`}
      ref={ref}
      style={{ backgroundImage: `url('${imageUrl}')` }}
    />
  );
}
