"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";

export function CartDrawer() {
  const {
    closeCart,
    count,
    isCartOpen,
    items,
    removeItem,
    subtotal,
    updateQuantity,
  } = useCart();
  const currencySymbol = items[0]?.currencySymbol ?? "$";

  const money = (value: number) =>
    `${currencySymbol}${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    })}`;

  return (
    <div
      className={`fixed inset-0 z-[70] transition ${
        isCartOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <button
        aria-label="Close cart"
        className={`absolute inset-0 bg-[#171412]/30 transition-opacity ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
        type="button"
      />
      <aside
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-[#e6ecf4] text-[#6c93c4] shadow-2xl transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-white px-7 py-7">
          <h2 className="font-serif text-2xl tracking-wide">
            Cart <span className="ml-2">({count})</span>
          </h2>
          <button
            aria-label="Close cart"
            className="inline-flex h-10 w-10 items-center justify-center text-[#6c93c4]"
            onClick={closeCart}
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-8">
          {items.length > 0 ? (
            <div className="space-y-8">
              {items.map((item) => (
                <div className="grid grid-cols-[88px_1fr_auto] gap-5" key={item.countryItemId}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.name}
                      className="h-[88px] w-[88px] bg-white object-cover"
                      src={item.imageUrl}
                    />
                  ) : (
                    <div className="h-[88px] w-[88px] bg-white" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold uppercase tracking-wide">
                      {item.name}
                    </p>
                    <div className="mt-6 inline-flex items-center border-b border-[#6c93c4]/55">
                      <button
                        aria-label={`Decrease ${item.name}`}
                        className="grid h-8 w-8 place-items-center"
                        onClick={() =>
                          updateQuantity(item.countryItemId, item.quantity - 1)
                        }
                        type="button"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="grid h-8 w-8 place-items-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`Increase ${item.name}`}
                        className="grid h-8 w-8 place-items-center"
                        onClick={() =>
                          updateQuantity(item.countryItemId, item.quantity + 1)
                        }
                        type="button"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      aria-label={`Remove ${item.name}`}
                      className="grid h-9 w-9 place-items-center text-white"
                      onClick={() => removeItem(item.countryItemId)}
                      type="button"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <p className="text-sm font-medium">
                      {money(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-2xl font-medium">Your cart is empty</p>
                <Link
                  className="mt-6 inline-flex border-b border-[#6c93c4] pb-1 text-sm font-semibold uppercase tracking-wide"
                  href="/shop"
                  onClick={closeCart}
                >
                  Shop now
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#adc5e7] px-7 py-6 text-white">
          <div className="flex items-center justify-between text-xl font-semibold">
            <span>Subtotal:</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm font-semibold">
            <Link
              className="py-3"
              href="/checkout"
              onClick={closeCart}
            >
              Checkout
            </Link>
            <Link className="py-3" href="/checkout" onClick={closeCart}>
              View cart
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
