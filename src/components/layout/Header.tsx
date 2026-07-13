"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";
import { CountrySelector } from "@/components/country/CountrySelector";
import { shell } from "@/lib/design";

// Verified against the live original site: the header is always
// position:fixed, always fully transparent, never hides or gains a
// background/border/shadow on scroll. Do not reintroduce scroll-linked
// show/hide or background-fade behavior here without re-verifying live.
export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { count, openCart } = useCart();
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/our-story", label: "Our Story" },
    { href: "/contact", label: "Contact" },
  ];

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-transparent">
      <div className={`${shell} grid min-h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-4 py-3 md:min-h-[90px]`}>
        <div className="flex items-center md:hidden">
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center text-white"
            onClick={() => setIsOpen((value) => !value)}
            type="button"
          >
            {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-8 w-8" />}
          </button>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white md:flex">
          {links.map((link) => (
            <Link
              className="transition hover:opacity-70"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          className="flex items-center justify-center"
          href="/"
          aria-label="Heaven Beauty home"
        >
          <Image
            alt="Heaven Beauty"
            className="h-auto w-[170px] object-contain brightness-0 invert sm:w-[230px]"
            height={149}
            priority
            src="/images/heaven-beauty-logo.png"
            unoptimized
            width={508}
          />
        </Link>
        <div className="flex items-center justify-end gap-3">
          <div className="hidden sm:block">
            <CountrySelector />
          </div>
          <button
            aria-label="Search products"
            className="grid h-10 w-10 place-items-center text-white md:hidden"
            onClick={() => {
              window.location.href = "/shop";
            }}
            type="button"
          >
            <Search className="h-6 w-6" />
          </button>
          <button
            aria-label={`Open cart with ${count} items`}
            className="relative grid h-10 w-10 place-items-center text-white md:hidden"
            onClick={openCart}
            type="button"
          >
            <ShoppingBag className="h-7 w-7" />
            <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#b7cdea] px-1 text-[10px] font-semibold text-white">
              <span suppressHydrationWarning>{count}</span>
            </span>
          </button>
          <button
            className="hidden h-9 border border-white/40 bg-transparent px-3 text-xs font-medium uppercase tracking-wide text-white transition hover:border-white sm:inline-flex sm:items-center"
            onClick={openCart}
            type="button"
          >
            Cart (<span suppressHydrationWarning>{count}</span>)
          </button>
        </div>
      </div>
      <div
        className={`grid overflow-hidden border-t border-[#6c93c4]/10 bg-white/96 shadow-xl backdrop-blur-md transition-all duration-500 md:hidden ${
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-6 pb-8 pt-6">
            {links.map((link) => (
              <Link
                className={`origin-left text-xl font-medium uppercase tracking-wide transition duration-300 hover:translate-x-2 ${
                  pathname === link.href ? "text-[#b7cdea]" : "text-[#6c93c4]"
                }`}
                href={link.href}
                key={link.href}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <CountrySelector />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
