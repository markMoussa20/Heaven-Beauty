"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ProductGrid } from "@/components/products/ProductGrid";
import { getDisplayPrice } from "@/lib/pricing";
import type { CountryItemWithProduct } from "@/types/database";

type SortOption = "default" | "latest" | "price-low" | "price-high";

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Sort by", value: "default" },
  { label: "Latest", value: "latest" },
  { label: "Price: low to high", value: "price-low" },
  { label: "Price: high to low", value: "price-high" },
];

export function ShopCatalog({
  items,
  selectedCountryName,
}: {
  items: CountryItemWithProduct[];
  selectedCountryName: string;
}) {
  const [sort, setSort] = useState<SortOption>("default");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const selectedOption = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeMenu);
    return () => window.removeEventListener("pointerdown", closeMenu);
  }, []);
  const sortedItems = useMemo(() => {
    const nextItems = [...items];

    if (sort === "price-low") {
      return nextItems.sort((left, right) => Number(getDisplayPrice(left)) - Number(getDisplayPrice(right)));
    }

    if (sort === "price-high") {
      return nextItems.sort((left, right) => Number(getDisplayPrice(right)) - Number(getDisplayPrice(left)));
    }

    if (sort === "latest") {
      return nextItems.sort(
        (left, right) =>
          new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime(),
      );
    }

    return nextItems.sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0));
  }, [items, sort]);

  return (
    <div>
      <div className="relative mb-8 text-[#6c93c4]" ref={sortMenuRef}>
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="flex h-12 w-full items-center justify-between border-b border-[#6c93c4]/55 text-left text-sm font-normal"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          {selectedOption.label}
          <ChevronDown aria-hidden="true" className={`h-5 w-5 transition ${isMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {isMenuOpen ? (
          <div className="absolute inset-x-0 top-full z-20 border border-[#6c93c4]/35 bg-white py-1 shadow-lg" role="menu">
            {sortOptions.map((option) => (
              <button
                className={`block w-full px-4 py-3 text-left text-sm transition hover:bg-[#e6ecf4] ${
                  option.value === sort ? "bg-[#e6ecf4] font-medium" : "font-light"
                }`}
                key={option.value}
                onClick={() => {
                  setSort(option.value);
                  setIsMenuOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <ProductGrid
        groupByCategory={sort === "default"}
        hideSectionTitles={sort !== "default"}
        items={sortedItems}
        preserveItemOrder
        selectedCountryName={selectedCountryName}
      />
    </div>
  );
}
