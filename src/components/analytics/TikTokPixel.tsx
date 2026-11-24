"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { TIKTOK_PIXEL_ID } from "@/lib/analytics/tiktok-pixel";

/**
 * TikTok pixel base code. The snippet's own `ttq.page()` only runs on a full
 * document load, so client-side route changes are tracked manually.
 * The admin area is excluded - staff traffic is not audience data.
 */
export function TikTokPixel() {
  const pathname = usePathname();
  const trackedPathname = useRef<string | null>(null);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isEnabled = Boolean(TIKTOK_PIXEL_ID) && !isAdminRoute;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // The first public page view is already reported by the base code below.
    if (trackedPathname.current === null) {
      trackedPathname.current = pathname;
      return;
    }

    if (trackedPathname.current === pathname) {
      return;
    }

    trackedPathname.current = pathname;
    window.ttq?.page();
  }, [isEnabled, pathname]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

ttq.load('${TIKTOK_PIXEL_ID}');
ttq.page();
}(window, document, 'ttq');`,
      }}
    />
  );
}
