"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { getDisplayPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/browser";
import {
  getPrimaryProductImagePath,
  getProductImageUrl,
} from "@/lib/storage/product-images";
import type { CountryItemWithProduct } from "@/types/database";

type ProductCardProps = {
  item: CountryItemWithProduct;
};

export function ProductCard({ item }: ProductCardProps) {
  const price = getDisplayPrice(item);
  const unitPrice = Number(price);
  const product = item.products;
  const country = item.countries;
  const { addItem, openCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const supabase = createClient();
  const imageUrl = getProductImageUrl(
    supabase,
    getPrimaryProductImagePath(product),
  );
  const hasSalePrice = Number(item.sale_price ?? 0) > 0;

  const handleAddToCart = () => {
    addItem({
      countryItemId: item.id,
      productId: product.id,
      name: product.name,
      imageUrl,
      unitPrice,
      currencyCode: country.currency_code,
      currencySymbol: country.currency_symbol,
      countryCode: country.code,
    });
    openCart();
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article className="group bg-white text-[#6c93c4]">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-white">
        {hasSalePrice ? (
          <span className="absolute left-2 top-2 z-10 bg-[#e6ecf4] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#6c93c4] sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
            Sale
          </span>
        ) : null}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={product.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-white px-8 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-[#6c93c4]">
              Heaven Beauty
            </span>
            <span className="mt-8 flex h-28 w-24 rotate-[-28deg] items-end justify-center rounded-[2rem] border border-[#e6ecf4] bg-[#f8fbff] pb-4">
              <span className="h-16 w-14 rounded-[1.5rem] bg-[#d48a8a]/70" />
            </span>
            <span className="mt-7 text-sm font-light text-[#6c93c4]">
              Product image coming soon
            </span>
          </div>
        )}
      </div>
      <div className="px-3 pb-4 pt-3 sm:px-7 sm:pb-7 sm:pt-4">
        <div className="min-h-11 sm:min-h-14">
          <h3 className="line-clamp-2 text-sm font-normal leading-5 text-[#6c93c4] sm:text-base sm:leading-6">
            {product.name}
          </h3>
        </div>
        <div className="mt-2 flex flex-col gap-3 sm:mt-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-light text-[#6c93c4] sm:text-sm">
              {country.currency_symbol}
              {price}
              <span className="ml-1 text-[10px] uppercase sm:text-xs">
                {country.currency_code}
              </span>
            </p>
          </div>
          <button
            className="rounded-[2px] bg-[#6c93c4] px-3 py-2 text-xs font-normal tracking-[0.02em] text-[#e6ecf4] transition duration-300 hover:bg-[#a8c5e8] hover:text-white sm:px-5 sm:py-4 sm:text-sm"
            onClick={handleAddToCart}
            type="button"
          >
            {justAdded ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
