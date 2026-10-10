import type { DiscountValueType, ItemPricing } from "@/types/database";

type PriceSource = {
  price: number | string | null;
};

type PricedSource = PriceSource & {
  pricing?: ItemPricing;
};

/** A row returned by the public.country_item_prices RPC. */
export type CountryItemPriceRow = {
  country_item_id: string;
  original_price: number | string;
  final_price: number | string;
  discount_id: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  discount_amount: number | string | null;
};

/** What the shopper pays per unit: the discounted price when one is attached. */
export function getDisplayPrice(item: PricedSource) {
  return item.pricing?.finalPrice ?? resolveItemPrice(item);
}

export function resolveItemPrice(item: PriceSource | null | undefined) {
  return toFiniteNumber(item?.price) ?? 0;
}

export function toItemPricing(row: CountryItemPriceRow): ItemPricing {
  const originalPrice = toFiniteNumber(row.original_price) ?? 0;
  const finalPrice = toFiniteNumber(row.final_price) ?? originalPrice;
  const discountType: DiscountValueType | null =
    row.discount_type === "percent" || row.discount_type === "amount" ? row.discount_type : null;

  return {
    originalPrice,
    finalPrice,
    discountType,
    discountValue: discountType ? toFiniteNumber(row.discount_value) : null,
    discountAmount: discountType ? toFiniteNumber(row.discount_amount) ?? 0 : 0,
  };
}

/** "-10%" or "-$5"; null when there is nothing to show. */
export function formatDiscountBadge(
  type: DiscountValueType | null,
  value: number | null,
  currencySymbol: string,
) {
  if (!type || value === null || !(value > 0)) return null;
  const amount = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return type === "percent" ? `-${amount}%` : `-${currencySymbol}${amount}`;
}

export function getItemPricing(item: PricedSource, currencySymbol: string) {
  const final = getDisplayPrice(item);
  const original = item.pricing?.originalPrice ?? final;
  const isDiscounted = Math.round(original * 100) > Math.round(final * 100);

  return {
    original,
    final,
    isDiscounted,
    badge: isDiscounted
      ? formatDiscountBadge(item.pricing?.discountType ?? null, item.pricing?.discountValue ?? null, currencySymbol)
      : null,
  };
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
