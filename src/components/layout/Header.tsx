import Link from "next/link";

import { CountrySelector } from "@/components/country/CountrySelector";
import { shell } from "@/lib/design";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#eadbd4] bg-white/95 backdrop-blur">
      <div className="bg-[#2b2523] px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-[#f7e8df]">
        Local currency, country-specific prices, and delivery at checkout
      </div>
      <div className={`${shell} flex min-h-20 items-center justify-between gap-4 py-3`}>
        <nav className="hidden flex-1 items-center gap-7 text-sm font-semibold text-[#6f625d] md:flex">
          <Link className="transition hover:text-[#2b2523]" href="/">
            Home
          </Link>
          <Link className="transition hover:text-[#2b2523]" href="/products">
            Shop
          </Link>
          <Link className="transition hover:text-[#2b2523]" href="/contact">
            Contact
          </Link>
        </nav>
        <Link
          className="flex flex-1 flex-col items-start text-[#2b2523] md:items-center"
          href="/"
        >
          <span className="text-2xl font-semibold leading-none tracking-wide">
            Heaven Beauty
          </span>
          <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[#b48a7b]">
            Beauty Store
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3">
          <CountrySelector />
          <button className="hidden h-10 rounded-full border border-[#eadbd4] bg-white px-4 text-sm font-semibold text-[#2b2523] transition hover:border-[#d7b9ad] sm:inline-flex sm:items-center">
            Cart (0)
          </button>
        </div>
      </div>
    </header>
  );
}
