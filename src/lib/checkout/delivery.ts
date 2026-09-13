/**
 * Mirrors the delivery rule in public.place_order so checkout shows the same
 * fee the order is saved with: delivery is free once the items subtotal
 * reaches the country's free_delivery_threshold.
 */
export type DeliveryQuote = {
  fee: number;
  isFree: boolean;
  /** How much more the customer must add for free delivery, when that applies. */
  amountToFree: number | null;
};

export function parseFreeDeliveryThreshold(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const threshold = Number(value);
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : null;
}

const toCents = (value: number) => Math.round(value * 100);

export function quoteDelivery({
  baseFee,
  subtotal,
  freeDeliveryThreshold,
}: {
  baseFee: number;
  subtotal: number;
  freeDeliveryThreshold: number | string | null | undefined;
}): DeliveryQuote {
  const threshold = parseFreeDeliveryThreshold(freeDeliveryThreshold);
  const qualifies = threshold !== null && toCents(subtotal) >= toCents(threshold);
  const fee = qualifies ? 0 : Math.max(0, baseFee);

  return {
    fee,
    isFree: fee === 0,
    amountToFree:
      threshold !== null && fee > 0 ? (toCents(threshold) - toCents(subtotal)) / 100 : null,
  };
}
