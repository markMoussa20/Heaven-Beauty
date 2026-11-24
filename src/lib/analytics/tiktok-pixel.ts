// TikTok pixel helpers. Like the Meta pixel, the id is public (it ships in the
// browser snippet) but lives in an env var so staging/preview builds can run
// without polluting the production dataset.
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() ?? "";

type TikTokQueue = {
  page: () => void;
  track: (
    name: string,
    params?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

type TikTokEventName =
  | "AddToCart"
  | "CompletePayment"
  | "InitiateCheckout"
  | "Search"
  | "ViewContent";

type TikTokEventParams = Record<string, unknown>;

type TikTokEventOptions = {
  /** Dedupe key, matched against the same event_id sent by the Events API. */
  event_id?: string;
};

/**
 * Fires a standard pixel event. No-ops when the pixel is unconfigured, when the
 * snippet has not loaded yet, or on the server, so call sites never need guards.
 */
export function trackTikTokEvent(
  name: TikTokEventName,
  params?: TikTokEventParams,
  options?: TikTokEventOptions,
) {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined" || !window.ttq) {
    return;
  }

  window.ttq.track(name, params ?? {}, options);
}

type TikTokContentSource = {
  productId: string;
  name?: string;
  quantity: number;
  unitPrice: number;
};

/** Shapes cart lines into the `contents` array TikTok expects for value events. */
export function toTikTokContents(items: TikTokContentSource[]) {
  return items.map((item) => ({
    content_id: item.productId,
    content_type: "product",
    ...(item.name ? { content_name: item.name } : {}),
    quantity: item.quantity,
    price: item.unitPrice,
  }));
}
