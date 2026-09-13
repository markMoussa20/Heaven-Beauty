import Image from "next/image";
import Link from "next/link";
import type { Ref } from "react";
import { X } from "lucide-react";

import { isExternalHref, type StorefrontPromoBanner } from "@/lib/promo-banners/storefront";

export type PromoBannerStripContent = Omit<StorefrontPromoBanner, "id" | "dismissKey">;

/**
 * Presentational announcement bar shared by the storefront and the admin live preview.
 * With `preview`, the button and close icon render inertly so the admin form isn't navigated.
 */
export function PromoBannerStrip({
  banner,
  onDismiss,
  preview = false,
  stripRef,
}: {
  banner: PromoBannerStripContent;
  onDismiss?: () => void;
  preview?: boolean;
  stripRef?: Ref<HTMLDivElement>;
}) {
  const hasCta = Boolean(banner.cta_label?.trim() && (banner.cta_href?.trim() || preview));
  const ctaClassName =
    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:opacity-85";
  const ctaStyle = {
    backgroundColor: banner.button_background_color,
    color: banner.button_text_color,
  };

  let cta = null;
  if (hasCta && (preview || !banner.cta_href)) {
    cta = <span className={ctaClassName} style={ctaStyle}>{banner.cta_label}</span>;
  } else if (hasCta && banner.cta_href && isExternalHref(banner.cta_href)) {
    cta = (
      <a className={ctaClassName} href={banner.cta_href} rel="noopener noreferrer" style={ctaStyle}>
        {banner.cta_label}
      </a>
    );
  } else if (hasCta && banner.cta_href) {
    cta = (
      <Link className={ctaClassName} href={banner.cta_href} style={ctaStyle}>
        {banner.cta_label}
      </Link>
    );
  }

  return (
    <div
      aria-label="Promotion"
      className="relative w-full"
      ref={stripRef}
      role={preview ? undefined : "region"}
      style={{ backgroundColor: banner.background_color, color: banner.text_color }}
    >
      <div className="mx-auto flex min-h-11 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-2 pl-4 pr-12 text-center text-sm font-medium md:px-12">
        {banner.image_url ? (
          <Image
            alt=""
            className="h-7 w-auto shrink-0 object-contain"
            height={28}
            src={banner.image_url}
            unoptimized={preview}
            width={112}
          />
        ) : null}
        <p className="leading-snug">{banner.message || (preview ? "Your message appears here" : "")}</p>
        {cta}
      </div>
      {banner.is_dismissible === false ? null : preview ? (
        <span aria-hidden="true" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center">
          <X className="h-4 w-4" />
        </span>
      ) : (
        <button
          aria-label="Dismiss promotion"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition hover:bg-black/10"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
