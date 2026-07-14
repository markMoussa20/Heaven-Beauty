"use client";

import { Minus, Plus, Share2 } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { getDisplayPrice } from "@/lib/pricing";
import type { CountryItemWithProduct } from "@/types/database";

export function ProductDetail({
  imageUrls,
  item,
}: {
  imageUrls: string[];
  item: CountryItemWithProduct;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCart();
  const product = item.products;
  const country = item.countries;
  const price = Number(getDisplayPrice(item));
  const imageUrl = imageUrls[activeImage] ?? null;

  const addToCart = () => {
    addItem(
      {
        countryItemId: item.id,
        productId: product.id,
        name: product.name,
        imageUrl,
        unitPrice: price,
        currencyCode: country.currency_code,
        currencySymbol: country.currency_symbol,
        countryCode: country.code,
      },
      quantity,
    );
    openCart();
  };

  const shareProduct = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
      return;
    }

    await navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)] lg:gap-16 lg:px-10 lg:py-20">
      <div className="min-w-0">
        <div className="relative aspect-square bg-white">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={product.name}
              className="h-full w-full object-contain"
              src={imageUrl}
            />
          ) : (
            <div className="grid h-full place-items-center px-8 text-center text-[#6c93c4]">
              Product image coming soon
            </div>
          )}
        </div>
        {imageUrls.length > 1 ? (
          <div className="mt-4 flex gap-3">
            {imageUrls.map((url, index) => (
              <button
                aria-label={`Show image ${index + 1} for ${product.name}`}
                className={`h-16 w-16 overflow-hidden border ${
                  activeImage === index
                    ? "border-[#6c93c4]"
                    : "border-transparent opacity-65 hover:opacity-100"
                }`}
                key={url}
                onClick={() => setActiveImage(index)}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="h-full w-full object-cover" src={url} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center py-3 lg:py-8">
        <h1 className="text-[27px] font-normal leading-[1.2] text-[#6c93c4] sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-6 text-lg font-normal text-[#6c93c4]">
          {country.currency_symbol}
          {price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="ml-2 text-sm uppercase">{country.currency_code}</span>
        </p>
        {product.short_description || product.description ? (
          <p className="mt-7 max-w-xl text-base font-light leading-8 text-[#6c93c4] sm:text-lg sm:leading-9">
            {product.short_description || product.description}
          </p>
        ) : null}
        <div className="mt-10 flex items-center gap-5">
          <div className="flex h-[52px] items-center border-b border-[#6c93c4]/55">
            <button
              aria-label="Decrease quantity"
              className="grid h-full w-11 place-items-center text-[#6c93c4] disabled:opacity-35"
              disabled={quantity === 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              type="button"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="grid h-full w-10 place-items-center text-base text-[#6c93c4]">
              {quantity}
            </span>
            <button
              aria-label="Increase quantity"
              className="grid h-full w-11 place-items-center text-[#6c93c4]"
              onClick={() => setQuantity((value) => value + 1)}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            className="h-[52px] min-w-[190px] bg-[#7d9bc9] px-7 text-sm font-medium text-white transition hover:bg-[#6c93c4]"
            onClick={addToCart}
            type="button"
          >
            Add to cart
          </button>
        </div>
        <button
          className="mt-9 inline-flex w-fit items-center gap-3 rounded-full border border-[#6c93c4] px-5 py-3 text-sm font-light text-[#6c93c4] transition hover:bg-[#6c93c4] hover:text-white"
          onClick={shareProduct}
          type="button"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </section>
  );
}
