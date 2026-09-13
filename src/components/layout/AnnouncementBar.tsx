"use client";

import { useEffect, useRef, useState } from "react";

import { PromoBannerStrip } from "@/components/layout/PromoBannerStrip";
import { recordDismissal, type StorefrontPromoBanner } from "@/lib/promo-banners/storefront";

/**
 * Promo strip rendered above the header. On desktop the header is `position: fixed`,
 * so the bar publishes its remaining visible height as `--promo-bar-offset` and the
 * header sits just below it until the bar scrolls out of view.
 */
const DESKTOP_BAR_HEIGHT = 44;

export function AnnouncementBar({ banner }: { banner: StorefrontPromoBanner }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (isDismissed || !bar) return;

    const root = document.documentElement;
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const offset = Math.max(0, bar.offsetHeight - window.scrollY);
      root.style.setProperty("--promo-bar-offset", `${offset}px`);
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    update();
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(bar);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--promo-bar-offset");
    };
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <>
      {/* Correct offset for the server render, before the effect measures the bar. */}
      <style>{`@media (min-width: 768px) { :root { --promo-bar-offset: ${DESKTOP_BAR_HEIGHT}px; } }`}</style>
      <PromoBannerStrip
        banner={banner}
        onDismiss={() => {
          recordDismissal(banner.dismissKey);
          setIsDismissed(true);
        }}
        stripRef={barRef}
      />
    </>
  );
}
