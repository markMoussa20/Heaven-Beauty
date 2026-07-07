import type { CountryItemWithProduct } from "@/types/database";

export function getDisplayPrice(item: CountryItemWithProduct) {
  return item.sale_price ?? item.price;
}
