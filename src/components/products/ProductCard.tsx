"use client";

import { getDisplayPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/browser";
import { getProductImageUrl } from "@/lib/storage/product-images";
import type { CountryItemWithProduct } from "@/types/database";

type ProductCardProps = {
  item: CountryItemWithProduct;
  featured?: boolean;
};

export function ProductCard({ item, featured = false }: ProductCardProps) {
  const price = getDisplayPrice(item);
  const product = item.products;
  const country = item.countries;
  const supabase = createClient();
  const imageUrl = getProductImageUrl(supabase, product.main_image_path);
  const hasSalePrice = item.sale_price !== null && item.sale_price !== undefined;

  return (
    <article className="group overflow-hidden rounded-[1.25rem] border border-[#eee1dc] bg-white shadow-[0_16px_50px_rgba(57,41,35,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(57,41,35,0.13)]">
      <div
        className={
          featured
            ? "relative flex aspect-[4/4.7] items-center justify-center overflow-hidden bg-[#f4ebe7]"
            : "relative flex aspect-[4/4.25] items-center justify-center overflow-hidden bg-[#f4ebe7]"
        }
      >
        {hasSalePrice ? (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#a06253] shadow-sm">
            Sale
          </span>
        ) : null}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#ffffff_0,#f1ded7_48%,#dcc7bd_100%)] px-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b48a7b]">
              Heaven Beauty
            </span>
            <span className="mt-4 h-24 w-16 rounded-full border border-white/80 bg-white/40 shadow-inner" />
            <span className="mt-5 text-sm font-medium text-[#7b6962]">
              Product image coming soon
            </span>
          </div>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-[#2b2523]">
            {product.name}
          </h3>
          {product.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7a6b65]">
              {product.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#a98b7f]">
              {country.currency_code}
            </p>
            <p className="text-xl font-semibold text-[#2b2523]">
              {country.currency_symbol}
              {price}
            </p>
          </div>
          <button className="rounded-full border border-[#2b2523] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#2b2523] transition hover:bg-[#2b2523] hover:text-white">
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
