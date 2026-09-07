"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { META_PIXEL_ID } from "@/lib/analytics/meta-pixel";

/**
 * Meta pixel base code. The snippet's own `fbq('track', 'PageView')` only runs
 * on a full document load, so client-side route changes are tracked manually.
 * The admin area is excluded - staff traffic is not audience data.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const trackedPathname = useRef<string | null>(null);
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isEnabled = Boolean(META_PIXEL_ID) && !isAdminRoute;

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
    window.fbq?.("track", "PageView");
  }, [isEnabled, pathname]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height="1"
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          style={{ display: "none" }}
          width="1"
        />
      </noscript>
    </>
  );
}
