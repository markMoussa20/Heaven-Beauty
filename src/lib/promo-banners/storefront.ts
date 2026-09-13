/**
 * Client-safe pieces of the storefront announcement bar: the serialized banner
 * shape passed from the root layout, and the dismissal cookie shared by the
 * server (to skip dismissed banners) and the browser (to record a dismissal).
 */

export type StorefrontPromoBanner = {
  id: string;
  dismissKey: string;
  message: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  background_color: string;
  text_color: string;
  button_background_color: string;
  button_text_color: string;
  is_dismissible: boolean;
};

export const PROMO_DISMISSED_COOKIE = "hb_promo_dismissed";
const MAX_DISMISSED_KEYS = 20;
const DISMISS_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

/** Changes whenever the banner is edited, so an edited banner shows again. */
export function getDismissKey(banner: { id: string; updated_at?: string | null }) {
  const version = banner.updated_at ? Date.parse(banner.updated_at) : 0;
  return `${banner.id}.${Number.isFinite(version) ? version : 0}`;
}

export function parseDismissedKeys(value: string | null | undefined) {
  if (!value) return [];
  try {
    return decodeURIComponent(value).split(",").filter(Boolean);
  } catch {
    return [];
  }
}

export function recordDismissal(dismissKey: string) {
  const current = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${PROMO_DISMISSED_COOKIE}=`))
    ?.slice(PROMO_DISMISSED_COOKIE.length + 1);
  const keys = parseDismissedKeys(current).filter((key) => key !== dismissKey);
  const next = [...keys, dismissKey].slice(-MAX_DISMISSED_KEYS).join(",");

  document.cookie = `${PROMO_DISMISSED_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${DISMISS_MAX_AGE_SECONDS}; samesite=lax`;
}

export function isExternalHref(href: string) {
  return /^https:\/\//i.test(href);
}
