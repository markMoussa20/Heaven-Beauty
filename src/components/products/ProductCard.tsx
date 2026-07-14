"use client";

import { useState } from "react";
import Link from "next/link";

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
  const productHref = product.slug ? `/product/${encodeURIComponent(product.slug)}` : null;

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
        {productHref ? <Link aria-label={`View ${product.name}`} className="absolute inset-0 z-[1]" href={productHref} /> : null}
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
      <div className="px-3 pb-3 pt-2 sm:px-7 sm:pb-7 sm:pt-4">
        <div className="min-h-0 sm:min-h-14">
          {productHref ? (
            <Link className="line-clamp-2 text-sm font-normal leading-5 text-[#6c93c4] transition hover:opacity-70 sm:text-base sm:leading-6" href={productHref}>
              {product.name}
            </Link>
          ) : (
            <h3 className="line-clamp-2 text-sm font-normal leading-5 text-[#6c93c4] sm:text-base sm:leading-6">
              {product.name}
            </h3>
          )}
        </div>
        <div className="mt-1 flex flex-col gap-1.5 sm:mt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
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
            className="mt-1 w-fit rounded-[2px] bg-[#6c93c4] px-3 py-2 text-xs font-normal tracking-[0.02em] text-[#e6ecf4] transition duration-300 hover:bg-[#a8c5e8] hover:text-white sm:mt-0 sm:px-5 sm:py-4 sm:text-sm"
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
