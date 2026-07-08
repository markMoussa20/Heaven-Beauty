"use client";

import Link from "next/link";
import { useState } from "react";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/countries", label: "Countries" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/country-items", label: "Country Items" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/exchange-rates", label: "Exchange Rates" },
];

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 bg-white p-3 lg:hidden">
      <button
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Close menu" : "Admin menu"}
      </button>
      {open ? (
        <nav className="mt-3 grid gap-2">
          {items.map((item) => (
            <Link
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
