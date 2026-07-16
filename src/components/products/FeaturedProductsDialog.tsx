"use client";

import { useState } from "react";

import { ProductCard } from "@/components/products/ProductCard";
import type { CountryItemWithProduct } from "@/types/database";

type FeaturedProductsDialogProps = {
  items: CountryItemWithProduct[];
  label: string;
};

export function FeaturedProductsDialog({
  items,
  label,
}: FeaturedProductsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="mt-8 inline-flex min-h-[46px] min-w-[70px] items-center justify-center bg-[#aac2e4] px-5 py-[15px] text-[13px] font-medium leading-[1.2] text-white transition duration-300 hover:bg-[#98b5dd] md:mt-[68px]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {label}
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end bg-[#172234]/45 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center sm:p-8"
          role="dialog"
        >
          <button
            aria-label="Close featured products"
            className="absolute inset-0 h-full w-full"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="relative max-h-[86vh] w-full overflow-y-auto bg-[#e6ecf4] p-4 text-[#6c93c4] shadow-2xl sm:max-w-[760px] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em]">
                  Featured
                </p>
                <h2 className="mt-2 text-[1.75rem] font-normal leading-tight sm:text-[2.4rem]">
                  Choose your tint
                </h2>
              </div>
              <button
                className="grid size-10 shrink-0 place-items-center border border-[#6c93c4]/25 text-2xl leading-none transition hover:bg-white"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                X
              </button>
            </div>
            {items.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,220px))] justify-center gap-4 sm:gap-5">
                {items.map((item) => (
                  <ProductCard item={item} key={item.id} variant="dialog" />
                ))}
              </div>
            ) : (
              <p className="bg-white px-5 py-6 text-sm leading-6">
                Featured products will appear here as soon as they are marked
                active for this country.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
