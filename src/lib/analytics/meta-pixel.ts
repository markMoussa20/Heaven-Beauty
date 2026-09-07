// Meta (Facebook) pixel helpers. The pixel id is public by design - it ships in
// the browser snippet - but it stays in an env var so staging/preview builds can
// run without polluting the production dataset.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MetaEventName =
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"
  | "Search"
  | "ViewContent";

type MetaEventParams = Record<string, unknown>;

type MetaEventOptions = {
  /** Dedupe key. Meta drops repeats of the same eventID within 48 hours. */
  eventID?: string;
};

/**
 * Fires a standard pixel event. No-ops when the pixel is unconfigured, when the
 * snippet has not loaded yet, or on the server, so call sites never need guards.
 */
export function trackMetaEvent(
  name: MetaEventName,
  params?: MetaEventParams,
  options?: MetaEventOptions,
) {
  if (!META_PIXEL_ID || typeof window === "undefined" || !window.fbq) {
    return;
  }

  window.fbq("track", name, params ?? {}, options);
}

type MetaContentSource = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

/** Shapes cart lines into the `contents` array Meta expects for value events. */
export function toMetaContents(items: MetaContentSource[]) {
  return items.map((item) => ({
    id: item.productId,
    quantity: item.quantity,
    item_price: item.unitPrice,
  }));
}
