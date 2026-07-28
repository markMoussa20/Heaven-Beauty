import type { Metadata } from "next";

import { lookupOrder } from "@/lib/tracking/actions";

export const metadata: Metadata = {
  title: "Track your order | Heaven Beauty",
  description: "View your Heaven Beauty order and delivery status.",
};

const errors: Record<string, string> = {
  invalid: "Enter your order number and the email address or phone number used at checkout.",
  "not-found": "We could not match those details to an order. Check both fields and try again.",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-[70vh] bg-[#e6ecf4] px-4 py-16 text-[#171412] md:py-28">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#6c93c4]">
          Order tracking
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.03em] md:text-5xl">
          Check your order
        </h1>
        <p className="mt-5 max-w-lg text-sm font-light leading-7 text-[#5d6470] md:text-base">
          Enter your order number and the same email address or phone number you
          used at checkout.
        </p>

        <form action={lookupOrder} className="mt-10 space-y-5 bg-white p-6 shadow-sm md:p-9">
          {error && errors[error] ? (
            <div
              className="border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              role="alert"
            >
              {errors[error]}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#6c93c4]">
              Order number
            </span>
            <input
              autoComplete="off"
              className="w-full border border-[#6c93c4]/20 bg-[#f8fafc] px-4 py-4 outline-none transition focus:border-[#6c93c4]"
              name="order_number"
              placeholder="HB-20260728-ABCD"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#6c93c4]">
              Email address or phone number
            </span>
            <input
              autoComplete="email"
              className="w-full border border-[#6c93c4]/20 bg-[#f8fafc] px-4 py-4 outline-none transition focus:border-[#6c93c4]"
              name="contact"
              placeholder="The contact used at checkout"
              required
            />
          </label>

          <button
            className="inline-flex w-full items-center justify-center bg-[#9eb9d9] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#6c93c4]"
            type="submit"
          >
            View order details
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-[#6c7180]">
          For your privacy, both details must match the order.
        </p>
      </div>
    </main>
  );
}

