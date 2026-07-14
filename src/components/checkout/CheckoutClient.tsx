"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { submitCheckout, type CheckoutState } from "@/lib/checkout/actions";
import type { Country, ShippingZone } from "@/types/database";

type CheckoutClientProps = {
  country: Country;
  idempotencyKey: string;
  shippingZones: ShippingZone[];
};

export function CheckoutClient({ country, idempotencyKey, shippingZones }: CheckoutClientProps) {
  const { hydrated, items, subtotal, updateQuantity, removeItem, clearCart } =
    useCart();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedSubmitRef = useRef(false);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    submitCheckout,
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(
    shippingZones[0]?.id ?? "",
  );
  const cartCountryCode = items[0]?.countryCode;
  const cartMatchesCountry =
    items.length === 0 || !cartCountryCode || cartCountryCode === country.code;
  const selectedZone = shippingZones.find((zone) => zone.id === selectedZoneId);
  const deliveryFee = country.use_shipping_zones
    ? Number(selectedZone?.fee ?? 0)
    : Number(country.global_delivery_fee ?? 0);
  const total = subtotal + deliveryFee;
  const cartItemsPayload = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          countryItemId: item.countryItemId,
          quantity: item.quantity,
        })),
      ),
    [items],
  );

  useEffect(() => {
    if (state?.ok) {
      clearCart();
    }
  }, [clearCart, state]);

  const money = (value: number) =>
    `${country.currency_symbol}${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    })}`;

  const submitDisabled =
    pending ||
    !hydrated ||
    items.length === 0 ||
    !cartMatchesCountry ||
    (country.use_shipping_zones && shippingZones.length === 0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (confirmedSubmitRef.current) {
      confirmedSubmitRef.current = false;
      return;
    }

    event.preventDefault();
    setConfirmOpen(true);
  };

  const confirmOrder = () => {
    confirmedSubmitRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  };

  if (state?.ok) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-[#6c93c4]">
        <p className="text-sm font-medium uppercase tracking-[0.28em]">
          Order received
        </p>
        <h1 className="mt-4 text-5xl font-medium">Thank you</h1>
        <p className="mx-auto mt-5 max-w-md text-base font-light leading-8">
          Your order {state.orderNumber} has been created. We will contact you
          to confirm the details.
        </p>
        <Link
          className="mt-8 inline-flex bg-[#9eb9d9] px-7 py-4 text-sm font-medium text-white transition hover:bg-[#6c93c4]"
          href="/"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#e6ecf4] pt-8 md:pt-28 text-[#6c93c4]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-12">
        <form
          action={action}
          className="space-y-8"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <input name="country_id" type="hidden" value={country.id} />
          <input name="cart_items" type="hidden" value={cartItemsPayload} />
          <input name="idempotency_key" type="hidden" value={idempotencyKey} />
          {!country.use_shipping_zones ? (
            <input name="shipping_zone_id" type="hidden" value="" />
          ) : null}

          <section className="space-y-4">
            <h1 className="text-3xl font-medium text-[#6c93c4]">Checkout</h1>
            {state && !state.ok ? (
              <div
                className="border border-red-300 bg-red-50 px-4 py-4 text-sm leading-6 text-red-800"
                role="alert"
              >
                <p className="font-semibold">Order could not be placed</p>
                <p className="mt-1">{state.error}</p>
              </div>
            ) : null}
            {!cartMatchesCountry ? (
              <div className="border border-[#6c93c4]/20 bg-white px-4 py-3 text-sm leading-6">
                Your cart contains items from another country. Switch back to{" "}
                {cartCountryCode} or{" "}
                <button
                  className="font-medium underline"
                  onClick={clearCart}
                  type="button"
                >
                  clear the cart
                </button>{" "}
                before checkout.
              </div>
            ) : null}
            {country.use_shipping_zones && shippingZones.length === 0 ? (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This country uses governorate delivery, but no active shipping
                zones are configured yet.
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-medium text-[#171412]">Contact</h2>
            <CheckoutField label="Mobile phone number" required>
              <input
                className={fieldClassName}
                name="phone"
                placeholder="Mobile phone number"
                required
                type="tel"
              />
            </CheckoutField>
            <CheckoutField label="Email address">
              <input
                className={fieldClassName}
                name="email"
                placeholder="Email address"
                type="email"
              />
            </CheckoutField>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-medium text-[#171412]">Delivery</h2>
            <p className="border border-[#6c93c4]/15 bg-white px-4 py-3 text-sm text-[#6c93c4]">
              Delivering to {country.name}. Change country from the site header
              before checkout if needed.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckoutField label="First name" required>
                <input
                  className={fieldClassName}
                  name="first_name"
                  placeholder="First name"
                  required
                />
              </CheckoutField>
              <CheckoutField label="Last name" required>
                <input
                  className={fieldClassName}
                  name="last_name"
                  placeholder="Last name"
                  required
                />
              </CheckoutField>
            </div>
            <CheckoutField label="Address" required>
              <input
                className={fieldClassName}
                name="address"
                placeholder="Address"
                required
              />
            </CheckoutField>
            <CheckoutField label="Apartment, suite, etc.">
              <input
                className={fieldClassName}
                name="apartment"
                placeholder="Apartment, suite, etc."
              />
            </CheckoutField>
            <CheckoutField label="City" required>
              <input
                className={fieldClassName}
                name="city"
                placeholder="City"
                required
              />
            </CheckoutField>
            {country.use_shipping_zones ? (
              <CheckoutField label="Governorate" required>
                <select
                  className={fieldClassName}
                  name="shipping_zone_id"
                  onChange={(event) => setSelectedZoneId(event.target.value)}
                  required
                  value={selectedZoneId}
                >
                  {shippingZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </CheckoutField>
            ) : null}
            <CheckoutField label="Postal code">
              <input
                className={fieldClassName}
                name="postal_code"
                placeholder="Postal code"
              />
            </CheckoutField>
            <CheckoutField label="Order notes">
              <textarea
                className="min-h-28 w-full border border-[#6c93c4]/20 bg-white px-4 py-3 text-[#171412] outline-none transition focus:border-[#6c93c4]"
                name="notes"
                placeholder="Order notes"
              />
            </CheckoutField>
          </section>

          <button
            className="flex w-full items-center justify-center gap-2 bg-[#6c93c4] px-7 py-4 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-[#547cae] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitDisabled}
            type="submit"
          >
            {pending ? (
              <LoadingSpinner className="size-4" label="Placing order" />
            ) : null}
            {pending ? "Placing order..." : `Place order - ${money(total)}`}
          </button>
        </form>

        <aside className="h-fit bg-white p-6 text-[#171412] lg:sticky lg:top-28">
          <div className="flex items-center justify-between border-b border-[#6c93c4]/15 pb-4">
            <h2 className="text-xl font-medium">Order summary</h2>
            <span className="text-sm text-[#6c93c4]">{items.length} items</span>
          </div>
          {items.length > 0 ? (
            <div className="divide-y divide-[#6c93c4]/10">
              {items.map((item) => (
                <div className="flex gap-4 py-4" key={item.countryItemId}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.name}
                      className="h-20 w-20 object-cover"
                      src={item.imageUrl}
                    />
                  ) : (
                    <div className="h-20 w-20 bg-[#e6ecf4]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-[#6c93c4]">
                      {money(item.unitPrice)} each
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="h-8 w-8 border border-[#6c93c4]/20 text-[#6c93c4]"
                        onClick={() =>
                          updateQuantity(item.countryItemId, item.quantity - 1)
                        }
                        type="button"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        className="h-8 w-8 border border-[#6c93c4]/20 text-[#6c93c4]"
                        onClick={() =>
                          updateQuantity(item.countryItemId, item.quantity + 1)
                        }
                        type="button"
                      >
                        +
                      </button>
                      <button
                        className="ml-auto text-xs uppercase tracking-wide text-[#6c93c4]"
                        onClick={() => removeItem(item.countryItemId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {money(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#6c93c4]">
              Your cart is empty.
            </div>
          )}
          <div className="space-y-3 border-t border-[#6c93c4]/15 pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{money(deliveryFee)}</span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-medium">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </aside>
      </div>
      <ConfirmDialog
        confirmLabel={pending ? "Placing..." : "Place order"}
        description="Please confirm that the delivery details and order total are correct."
        disabled={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmOrder}
        open={confirmOpen}
        title="Confirm your order"
      >
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{money(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-[#6c93c4]/15 pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}

const fieldClassName =
  "h-14 w-full border border-[#6c93c4]/20 bg-white px-4 text-[#171412] outline-none transition focus:border-[#6c93c4]";

function CheckoutField({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#6c93c4]">
      <span>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
