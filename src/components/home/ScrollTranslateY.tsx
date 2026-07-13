"use client";

import { useEffect, useRef } from "react";

// Mirrors the original site's Elementor "motion effects" scroll-linked
// translateY on this section's heading (verified directly from DevTools:
// data-settings has "motion_fx_translateY_effect":"yes",
// "motion_fx_motion_fx_scrolling":"yes", "motion_fx_devices":["desktop"]
// only, and the live inline style shows
// "--e-transform-transition-duration: 100ms" with default easing).
// This is a position effect only \u2014 no rotation, no opacity change \u2014
// and it must stay desktop-only (>=1025px), matching Elementor's own
// "desktop" device bucket.
const DESKTOP_MIN_WIDTH = 1025;

export function ScrollTranslateY({
  children,
  className,
  maxPixels = 60,
}: {
  children: React.ReactNode;
  className?: string;
  maxPixels?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = ref.current;
    const motion = motionRef.current;
    if (!anchor || !motion) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      if (window.innerWidth < DESKTOP_MIN_WIDTH) {
        motion.style.transform = "";
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      // Positive when the element is below the viewport center (section just
      // entered — heading pushed down), easing to negative as it scrolls past
      // (heading pulled up). This matches the observed live values: inline
      // --translateY of +100px on entry, around -95px when scrolled past.
      const progress = (center - viewportHeight / 2) / (viewportHeight / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      motion.style.transform = `translateY(${(clamped * maxPixels).toFixed(1)}px)`;
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
  }, [maxPixels]);

  return (
    <div className={className} ref={ref}>
      <div
        className="[transition:transform_100ms] motion-reduce:transform-none"
        ref={motionRef}
      >
        {children}
      </div>
    </div>
  );
}
