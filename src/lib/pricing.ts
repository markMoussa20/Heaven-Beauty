import type { CountryItemWithProduct } from "@/types/database";

type PriceSource = {
  price: number | string | null;
  sale_price?: number | string | null;
};

export function getDisplayPrice(item: CountryItemWithProduct) {
  return resolveItemPrice(item);
}

export function resolveItemPrice(item: PriceSource | null | undefined) {
  const salePrice = toFiniteNumber(item?.sale_price);
  if (salePrice !== null && salePrice > 0) {
    return salePrice;
  }

  return toFiniteNumber(item?.price) ?? 0;
}

function toFiniteNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
