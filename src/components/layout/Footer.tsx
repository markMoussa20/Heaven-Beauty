import Link from "next/link";

import { shell } from "@/lib/design";

export function Footer() {
  return (
    <footer className="border-t border-[#eadbd4] bg-[#2b2523] text-[#f8ede8]">
      <div
        className={`${shell} grid gap-8 py-10 md:grid-cols-[1.1fr_0.8fr_0.8fr]`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tracking-wide">
              Heaven Beauty
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#d8b7a9]">
              Beauty Store
            </p>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#d8ccc6]">
            Country-aware beauty shopping with local pricing, currency, and
            delivery options for every supported market.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d8b7a9]">
            Shop
          </p>
          <div className="mt-4 grid gap-3 text-sm text-[#f8ede8]">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d8b7a9]">
            Delivery
          </p>
          <p className="mt-4 text-sm leading-7 text-[#d8ccc6]">
            Prices and delivery fees update based on the selected country.
            Area-based shipping zones will be available in checkout.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`${shell} py-5 text-xs text-[#bdaea7]`}>
          (c) Heaven Beauty. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
