"use server";

import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { notifyOrderCreated } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutState =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;

const cartLineSchema = z.object({
  countryItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

const checkoutSchema = z.object({
  countryId: z.string().uuid(),
  shippingZoneId: z.string().uuid().nullable(),
  idempotencyKey: z.string().uuid(),
  phone: z.string().trim().min(5).max(30),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  address: z.string().trim().min(3).max(250),
  apartment: z.string().trim().max(100),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(30),
  notes: z.string().trim().max(1000),
  items: z.array(cartLineSchema).min(1).max(50),
});

export async function submitCheckout(
  _: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("cart_items") ?? "[]"));
  } catch {
    return { ok: false, error: "Your cart could not be read. Please refresh and try again." };
  }

  const parsed = checkoutSchema.safeParse({
    countryId: formData.get("country_id"),
    shippingZoneId: String(formData.get("shipping_zone_id") ?? "") || null,
    idempotencyKey: formData.get("idempotency_key"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    firstName: formData.get("first_name"),
    lastName: formData.get("last_name"),
    address: formData.get("address"),
    apartment: formData.get("apartment") ?? "",
    city: formData.get("city"),
    postalCode: formData.get("postal_code") ?? "",
    notes: formData.get("notes") ?? "",
    items: rawItems,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please review the highlighted order details and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
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
  if (items.some((item) => item.quantity > 10)) {
    return { ok: false, error: "A product quantity cannot exceed 10." };
  }

  const requestHeaders = await headers();
  const source = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("cf-connecting-ip") || "unknown";
  const secret = process.env.CHECKOUT_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "checkout";
  const fingerprint = createHash("sha256").update(`${secret}:${source}`).digest("hex");
  const supabase = createAdminClient();
  const rpcClient = supabase as unknown as {
    rpc: (name: "place_order", args: Record<string, unknown>) => Promise<{
      data: Array<{ order_id: string; order_number: string; subtotal: number; shipping_fee: number; total: number }> | null;
      error: { code?: string; details?: string; message: string } | null;
    }>;
  };
  const { data, error } = await rpcClient.rpc("place_order", {
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
  });

  const result = data?.[0];
  if (error || !result) {
    console.error(
      `place_order RPC failed: ${JSON.stringify({
        code: error?.code ?? "NO_RESULT",
        details: error?.details ?? null,
        message: error?.message ?? "The RPC returned no order.",
      })}`,
    );
    return { ok: false, error: checkoutErrorMessage(error?.message) };
  }

  const [{ data: order }, { data: orderItems }] = await Promise.all([
    supabase.from("orders").select("*, countries(currency_code,currency_symbol)").eq("id", result.order_id).single(),
    supabase.from("order_items").select("*").eq("order_id", result.order_id),
  ]);

  if (order && orderItems) {
    notifyOrderCreated({ order, items: orderItems }).catch((notificationError) => {
      console.error("Post-commit order notification failed", notificationError);
    });
  } else {
    console.error("Order committed but notification payload could not be loaded", { orderId: result.order_id });
  }

  revalidatePath("/admin/orders");
  return { ok: true, orderNumber: result.order_number };
}

function checkoutErrorMessage(message?: string) {
  if (message?.includes("RATE_LIMITED")) return "Too many checkout attempts. Please wait a minute and try again.";
  if (message?.includes("INSUFFICIENT_STOCK")) return "One of your items no longer has enough stock. Please update your cart.";
  if (message?.includes("ITEM_UNAVAILABLE")) return "One or more cart items are no longer available.";
  if (message?.includes("INVALID_SHIPPING_ZONE")) return "The selected delivery area is not available for this country.";
  if (message?.includes("COUNTRY_UNAVAILABLE")) return "The selected country is not currently available.";
  if (message?.includes("subtotal") || message?.includes("orders")) {
    return "Checkout database setup is out of date. Please run the latest checkout migration and try again.";
  }
  return "We could not place your order. Please review your cart and try again.";
}
