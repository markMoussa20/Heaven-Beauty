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
  variant?: "catalog" | "dialog";
};

export function ProductCard({
  item,
  variant = "catalog",
}: ProductCardProps) {
  const price = getDisplayPrice(item);
  const unitPrice = Number(price);
  const product = item.products;
  const country = item.countries;
  const showCurrencyCode =
    country.currency_symbol.trim().toUpperCase() !==
    country.currency_code.trim().toUpperCase();
  const { addItem, openCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const supabase = createClient();
  const imageUrl = getProductImageUrl(
    supabase,
    getPrimaryProductImagePath(product),
  );
  const productHref = product.slug ? `/product/${encodeURIComponent(product.slug)}` : null;
  const isDialog = variant === "dialog";

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
    <article
      className={`group flex flex-col text-[#6c93c4] ${
        isDialog ? "gap-3" : "gap-4"
      }`}
    >
      <div className="bg-white">
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
        <div
          className={
            isDialog
              ? "px-4 pb-4 pt-3"
              : "px-3 pb-4 pt-3 sm:px-7 sm:pb-7 sm:pt-4"
          }
        >
          <div className="min-h-0 sm:min-h-14">
            {productHref ? (
              <Link
                className={`line-clamp-2 font-normal text-[#6c93c4] transition hover:opacity-70 ${
                  isDialog
                    ? "text-base leading-6"
                    : "text-sm leading-5 sm:text-lg sm:leading-7"
                }`}
                href={productHref}
              >
                {product.name}
              </Link>
            ) : (
              <h3
                className={`line-clamp-2 font-normal text-[#6c93c4] ${
                  isDialog
                    ? "text-base leading-6"
                    : "text-sm leading-5 sm:text-lg sm:leading-7"
                }`}
              >
                {product.name}
              </h3>
            )}
          </div>
          <div className="mt-2">
            <p
              className={`font-normal text-[#6c93c4] ${
                isDialog ? "text-sm" : "text-xs sm:text-sm"
              }`}
            >
              {country.currency_symbol}
              {price}
              {showCurrencyCode ? (
                <span className={`ml-1 uppercase ${isDialog ? "text-xs" : "text-[10px] sm:text-xs"}`}>
                  {country.currency_code}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
      <button
        className={`w-full rounded-[3px] bg-[#a8c7ea] px-5 font-normal text-white transition duration-300 hover:bg-[#8eb2dc] ${
          isDialog
            ? "min-h-12 py-3 text-base"
            : "min-h-12 py-3 text-sm sm:min-h-14 sm:py-4 sm:text-base"
        }`}
        onClick={handleAddToCart}
        type="button"
      >
        {justAdded ? "Added" : "Add to cart"}
      </button>
    </article>
  );
}
