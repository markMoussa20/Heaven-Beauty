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
          <span className="absolute left-4 top-4 z-10 bg-[#e6ecf4] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#6c93c4]">
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
      <div className="px-7 pb-7 pt-4">
        <div className="min-h-14">
          <h3 className="line-clamp-2 text-base font-normal leading-6 text-[#6c93c4]">
            {product.name}
          </h3>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-light text-[#6c93c4]">
              {country.currency_symbol}
              {price}
              <span className="ml-1 text-xs uppercase">
                {country.currency_code}
              </span>
            </p>
          </div>
          <button
            className="rounded-[2px] bg-[#6c93c4] px-5 py-4 text-sm font-normal tracking-[0.02em] text-[#e6ecf4] transition duration-300 hover:bg-[#a8c5e8] hover:text-white"
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
