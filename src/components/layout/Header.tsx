"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";
import { CountrySelector } from "@/components/country/CountrySelector";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const { count, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/our-story", label: "Our Story" },
    { href: "/contact", label: "Contact" },
  ];

  useEffect(() => {
    const mobileHeaderQuery = window.matchMedia("(max-width: 767px)");

    if (mobileHeaderQuery.matches) {
      return;
    }

    const hideAfterPixels = 76;
    const scrollThreshold = 6;
    const getScrollY = () =>
      Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        document.documentElement.scrollTop,
        0,
      );

    lastScrollY.current = getScrollY();

    const updateHeader = () => {
      const nextScrollY = getScrollY();
      const delta = nextScrollY - lastScrollY.current;

      if (nextScrollY <= 4 || isOpen) {
        setIsHidden(false);
        lastScrollY.current = nextScrollY;
        scrollFrame.current = null;
        return;
      }

      if (Math.abs(delta) < scrollThreshold) {
        scrollFrame.current = null;
        return;
      }

      if (nextScrollY <= hideAfterPixels) {
        setIsHidden(false);
      } else if (delta > 0) {
        setIsHidden(true);
      } else if (delta < 0) {
        setIsHidden(false);
      }

      lastScrollY.current = nextScrollY;
      scrollFrame.current = null;
    };

    const handleScroll = () => {
      if (scrollFrame.current === null) {
        scrollFrame.current = window.requestAnimationFrame(updateHeader);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrame.current !== null) {
        window.cancelAnimationFrame(scrollFrame.current);
      }
    };
  }, [isOpen]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header
      className={`site-header sticky inset-x-0 top-0 z-40 bg-[#86a3d3] md:fixed md:bg-transparent ${
        isHidden && !isOpen ? "site-header-hidden" : ""
      }`}
    >
      <div className="site-header-inner">
        <div className="flex items-center md:hidden">
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center text-[#6c93c4]"
            onClick={() => setIsOpen((value) => !value)}
            type="button"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" />}
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
            className="site-header-logo-desktop hidden h-auto w-[209px] object-contain md:block"
            height={155}
            priority
            src="/images/heaven-beauty-logo-desktop.png"
            unoptimized
            width={536}
          />
          <Image
            alt=""
            aria-hidden="true"
            className="h-auto w-full object-contain md:hidden"
            height={153}
            priority
            src="/images/heaven-beauty-logo-mobile.png"
            unoptimized
            width={575}
          />
        </Link>
        <div className="flex items-center justify-end gap-2 md:gap-3">
          <div className="hidden sm:block">
            <CountrySelector />
          </div>
          <button
            aria-label="Search products"
            aria-expanded={isSearchOpen}
            className="grid h-9 w-9 place-items-center text-[#6c93c4] md:hidden"
            onClick={() => setIsSearchOpen(true)}
            type="button"
          >
            <Search className="h-6 w-6" />
          </button>
          <button
            aria-label={`Open cart with ${count} items`}
            className="relative grid h-9 w-9 place-items-center text-[#6c93c4] md:hidden"
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
      {isSearchOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-[75.6px] z-50 bg-[#e6ecf4] px-5 py-8 md:hidden">
          <form
            className="mx-auto max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchQuery.trim();
              setIsSearchOpen(false);
              router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
            }}
          >
            <div className="flex items-center border-b border-[#6c93c4]">
              <input
                aria-label="Search products"
                autoFocus
                className="h-14 min-w-0 flex-1 bg-transparent text-xl font-light text-[#6c93c4] outline-none placeholder:text-[#6c93c4]/55"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
                value={searchQuery}
              />
              <button
                aria-label="Submit search"
                className="grid h-12 w-12 place-items-center text-[#6c93c4]"
                type="submit"
              >
                <Search className="h-6 w-6" />
              </button>
            </div>
            <button
              className="mt-7 text-sm font-medium uppercase tracking-wide text-[#6c93c4]"
              onClick={() => setIsSearchOpen(false)}
              type="button"
            >
              Close search
            </button>
          </form>
        </div>
      ) : null}
      <div
        className={`grid overflow-hidden bg-white/96 shadow-xl backdrop-blur-md transition-all duration-500 md:hidden ${
          isOpen
            ? "grid-rows-[1fr] border-t border-[#6c93c4]/10 opacity-100"
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
