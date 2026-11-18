"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { CheckoutProblem } from "@/lib/checkout/problem-email";
import { emailCheckoutProblem, getRequestFingerprint } from "@/lib/checkout/problem-report";
import {
  checkoutValidationMessage,
  MAX_LINE_QUANTITY,
  validateCheckout,
  type CheckoutFieldErrors,
} from "@/lib/checkout/schema";
import { notifyOrderCreated } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitOrderToWakilni } from "@/lib/wakilni/orders";

export type CheckoutState =
  | { ok: true; orderNumber: string; trackingToken?: string; total: number }
  | { ok: false; error: string; fieldErrors?: CheckoutFieldErrors }
  | null;

export async function submitCheckout(
  _: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = validateCheckout(formData);
  const fingerprint = await getRequestFingerprint();

  if (!parsed.ok) {
    const message = checkoutValidationMessage(parsed.fieldErrors);
    queueProblemEmail(formData, fingerprint, message, validationProblems(parsed.issues));
    return { ok: false, error: message, fieldErrors: parsed.fieldErrors };
  }

  const uniqueItems = new Map<string, number>();
  for (const item of parsed.data.items) {
    uniqueItems.set(item.countryItemId, (uniqueItems.get(item.countryItemId) ?? 0) + item.quantity);
  }
  const items = [...uniqueItems].map(([countryItemId, quantity]) => ({
    countryItemId,
    country_item_id: countryItemId,
    quantity,
    qty: quantity,
  }));
  if (items.some((item) => item.quantity > MAX_LINE_QUANTITY)) {
    const message = `A product quantity cannot exceed ${MAX_LINE_QUANTITY}.`;
    queueProblemEmail(formData, fingerprint, message, [{ field: "items", code: "too_big" }]);
    return { ok: false, error: message };
  }

  // The discounted subtotal the shopper confirmed. place_order_v2 refuses the
  // order (PRICE_CHANGED) if prices moved since; a missing or malformed value
  // skips that check rather than blocking checkout.
  const expectedSubtotal = readExpectedSubtotal(formData.get("expected_subtotal"));

  const supabase = createAdminClient();
  const rpcClient = supabase as unknown as {
    rpc: (name: "place_order_v2", args: Record<string, unknown>) => Promise<{
      data: Array<{
        order_id: string;
        order_number: string;
        subtotal: number;
        shipping_fee: number;
        total: number;
        discount_total: number;
      }> | null;
      error: { code?: string; details?: string; message: string } | null;
    }>;
  };
  const { data, error } = await rpcClient.rpc("place_order_v2", {
    p_country_id: parsed.data.countryId,
    p_items: items,
    p_shipping_zone_id: parsed.data.shippingZoneId,
    p_phone: parsed.data.phone,
    p_email: parsed.data.email || "",
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_address: parsed.data.address,
    p_apartment: parsed.data.apartment,
    p_city: parsed.data.city,
    p_postal_code: parsed.data.postalCode,
    p_notes: parsed.data.notes,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_rate_limit_fingerprint: fingerprint,
    p_expected_subtotal: expectedSubtotal,
  });

  const result = data?.[0];
  if (error || !result) {
    console.error(
      `place_order_v2 RPC failed: ${JSON.stringify({
        code: error?.code ?? "NO_RESULT",
        details: error?.details ?? null,
        message: error?.message ?? "The RPC returned no order.",
      })}`,
    );
    if (error?.message?.includes("PRICE_CHANGED")) {
      // Re-render /checkout with fresh prices so the cart re-prices itself.
      revalidatePath("/checkout");
    }
    const message = checkoutErrorMessage(error?.message);
    queueProblemEmail(formData, fingerprint, message, [
      { field: "order", code: orderErrorCode(error?.message) },
    ]);
    return { ok: false, error: message };
  }

  const [{ data: order }, { data: orderItems }] = await Promise.all([
    supabase.from("orders").select("*, countries(currency_code,currency_symbol)").eq("id", result.order_id).single(),
    supabase.from("order_items").select("*").eq("order_id", result.order_id),
  ]);

  if (order && orderItems) {
    try {
      await notifyOrderCreated({ order, items: orderItems });
    } catch (notificationError) {
      console.error("Post-commit order notification failed", notificationError);
    }
    try {
      await submitOrderToWakilni(result.order_id);
    } catch (wakilniError) {
      // The local checkout is already committed. Keep the customer success
      // response and expose the retryable integration failure to admins.
      console.error("Post-commit Wakilni submission failed", wakilniError);
    }
  } else {
    console.error("Order committed but notification payload could not be loaded", { orderId: result.order_id });
  }

  revalidatePath("/admin/orders");
  return {
    ok: true,
    orderNumber: result.order_number,
    trackingToken: (
      order as { public_tracking_token?: string | null } | null
    )?.public_tracking_token ?? undefined,
    total: Number(result.total),
  };
}

/**
 * Called by the checkout page when its own check stops an order before it is
 * sent, so staff hear about those attempts too. The form is re-checked here
 * rather than trusting the browser's verdict, and a valid form sends nothing.
 */
export async function reportCheckoutProblem(formData: FormData) {
  const parsed = validateCheckout(formData);
  if (parsed.ok) return;
  queueProblemEmail(
    formData,
    await getRequestFingerprint(),
    checkoutValidationMessage(parsed.fieldErrors),
    validationProblems(parsed.issues),
  );
}

/** Sends the staff email after the response, so the shopper never waits on SMTP. */
function queueProblemEmail(
  formData: FormData,
  fingerprint: string,
  customerMessage: string,
  problems: CheckoutProblem[],
) {
  after(() => emailCheckoutProblem({ customerMessage, fingerprint, formData, problems }));
}

function validationProblems(issues: { path: string; code: string }[]): CheckoutProblem[] {
  return issues.map((issue) => ({ field: issue.path.split(".")[0], code: issue.code }));
}

const ORDER_ERROR_CODES = [
  "PRICE_CHANGED",
  "RATE_LIMITED",
  "INSUFFICIENT_STOCK",
  "ITEM_UNAVAILABLE",
  "INVALID_SHIPPING_ZONE",
  "COUNTRY_UNAVAILABLE",
];

function orderErrorCode(message?: string) {
  return ORDER_ERROR_CODES.find((code) => message?.includes(code)) ?? "UNKNOWN";
}

function readExpectedSubtotal(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function checkoutErrorMessage(message?: string) {
  if (message?.includes("PRICE_CHANGED")) {
    return "Some prices changed while you were checking out. Please review your cart and place the order again.";
  }
  if (message?.includes("RATE_LIMITED")) return "Too many checkout attempts. Please wait a minute and try again.";
  if (message?.includes("INSUFFICIENT_STOCK")) return "One of your items no longer has enough stock. Please update your cart.";
  if (message?.includes("ITEM_UNAVAILABLE")) return "One or more cart items are no longer available.";
  if (message?.includes("INVALID_SHIPPING_ZONE")) return "The selected delivery area is not available for this country.";
  if (message?.includes("COUNTRY_UNAVAILABLE")) return "The selected country is not currently available.";
  if (message?.includes("subtotal") || message?.includes("orders") || message?.includes("place_order_v2")) {
    return "Checkout database setup is out of date. Please run the latest checkout migration and try again.";
  }
  return "We could not place your order. Please review your cart and try again.";
}
