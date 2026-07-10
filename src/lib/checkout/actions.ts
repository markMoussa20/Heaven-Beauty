"use server";

import { revalidatePath } from "next/cache";

import { notifyOrderCreated } from "@/lib/order-notifications";
import { resolveItemPrice } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckoutCartItem = {
  countryItemId: string;
  quantity: number;
  unitPrice?: number;
};

export type CheckoutState =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string }
  | null;

type CheckoutCountryItem = {
  id: string;
  country_id: string;
  product_id: string;
  price: number | string;
  sale_price: number | string | null;
  is_visible: boolean;
  products?: { name?: string | null; is_active?: boolean | null } | null;
};

type CheckoutCountry = {
  id: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  use_shipping_zones: boolean;
  global_delivery_fee: number | string | null;
};

type CheckoutShippingZone = {
  id: string;
  country_id: string;
  name: string;
  fee: number | string;
  is_active?: boolean | null;
};

type CheckoutResult = {
  data: unknown;
  error: { message: string } | null;
};

type CheckoutQuery = PromiseLike<CheckoutResult> & {
  eq: (column: string, value: unknown) => CheckoutQuery;
  in: (column: string, values: unknown[]) => CheckoutQuery;
  insert: (payload: unknown) => CheckoutQuery;
  maybeSingle: () => Promise<CheckoutResult>;
  upsert: (payload: unknown, options?: { onConflict?: string }) => CheckoutQuery;
  select: (columns?: string) => CheckoutQuery;
  single: () => Promise<CheckoutResult>;
};

type CheckoutSupabase = {
  from: (table: string) => CheckoutQuery;
};

export async function submitCheckout(
  _: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const countryId = String(formData.get("country_id") ?? "");
  const rawCart = String(formData.get("cart_items") ?? "[]");
  const shippingZoneId = String(formData.get("shipping_zone_id") ?? "");
  const phone = requiredText(formData, "phone");
  const email = optionalText(formData, "email");
  const firstName = requiredText(formData, "first_name");
  const lastName = requiredText(formData, "last_name");
  const address = requiredText(formData, "address");
  const city = requiredText(formData, "city");
  const apartment = optionalText(formData, "apartment");
  const postalCode = optionalText(formData, "postal_code");
  const notes = optionalText(formData, "notes");

  if (!countryId || !phone || !firstName || !lastName || !address || !city) {
    return { ok: false, error: "Please fill in all required checkout fields." };
  }

  let cartItems: CheckoutCartItem[];
  try {
    cartItems = JSON.parse(rawCart) as CheckoutCartItem[];
  } catch {
    return { ok: false, error: "Your cart could not be read. Please refresh and try again." };
  }

  const normalizedCart = cartItems
    .map((item) => ({
      countryItemId: String(item.countryItemId ?? ""),
      quantity: Math.max(1, Number(item.quantity ?? 0)),
      unitPrice: Number(item.unitPrice ?? 0),
    }))
    .filter((item) => item.countryItemId && Number.isFinite(item.quantity));

  if (normalizedCart.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const supabase = createAdminClient() as unknown as CheckoutSupabase;
  const { data: countryData, error: countryError } = await supabase
    .from("countries")
    .select("*")
    .eq("id", countryId)
    .eq("is_active", true)
    .maybeSingle();

  if (countryError || !countryData) {
    return { ok: false, error: "Selected country is not available." };
  }

  const country = countryData as CheckoutCountry;
  const itemIds = normalizedCart.map((item) => item.countryItemId);
  const { data: itemData, error: itemError } = await supabase
    .from("country_items")
    .select("*, products!inner(name,is_active)")
    .in("id", itemIds)
    .eq("country_id", countryId)
    .eq("is_visible", true)
    .eq("products.is_active", true);
  const availableItems = (itemData ?? []) as CheckoutCountryItem[];

  if (itemError || availableItems.length !== normalizedCart.length) {
    return {
      ok: false,
      error: "One or more cart items are no longer available for this country.",
    };
  }

  let shippingZone: CheckoutShippingZone | null = null;
  if (country.use_shipping_zones) {
    if (!shippingZoneId) {
      return { ok: false, error: "Please select a governorate." };
    }

    const { data: zoneData, error: zoneError } = await supabase
      .from("shipping_zones")
      .select("*")
      .eq("id", shippingZoneId)
      .eq("country_id", countryId)
      .eq("is_active", true)
      .maybeSingle();

    if (zoneError || !zoneData) {
      return { ok: false, error: "Selected governorate is not available." };
    }

    shippingZone = zoneData as CheckoutShippingZone;
  }

  const subtotal = normalizedCart.reduce((sum, cartItem) => {
    const item = availableItems.find(
      (availableItem) => availableItem.id === cartItem.countryItemId,
    );
    const unitPrice = resolveCheckoutPrice(item, cartItem.unitPrice);
    return sum + unitPrice * cartItem.quantity;
  }, 0);
  const shippingFee = country.use_shipping_zones
    ? Number(shippingZone?.fee ?? 0)
    : Number(country.global_delivery_fee ?? 0);
  const total = subtotal + shippingFee;
  const customerName = `${firstName} ${lastName}`.trim();
  const fullAddress = [address, apartment, city, postalCode]
    .filter(Boolean)
    .join(", ");
  const orderNumber = makeOrderNumber();

  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .upsert(
      {
        country_id: countryId,
        full_name: customerName,
        phone,
        email,
      },
      { onConflict: "country_id,phone" },
    )
    .select("id")
    .single();

  const customer = customerData as { id?: string } | null;

  if (customerError || !customer?.id) {
    return {
      ok: false,
      error: customerError?.message
        ? `Could not save customer details: ${customerError.message}`
        : "Could not save customer details. Please check the phone number and try again.",
    };
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      country_id: countryId,
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      currency_code: country.currency_code,
      shipping_zone_id: country.use_shipping_zones ? shippingZone?.id : null,
      shipping_area_name: country.use_shipping_zones
        ? (shippingZone?.name ?? city)
        : city,
      address_line: fullAddress,
      notes,
      subtotal,
      shipping_fee: shippingFee,
      total,
      payment_method: "COD",
      status: "pending",
    })
    .select("id")
    .single();

  const order = orderData as { id?: string } | null;

  if (orderError || !order?.id) {
    return {
      ok: false,
      error: orderError?.message
        ? `Could not create order: ${orderError.message}`
        : "Could not create order. Please try again.",
    };
  }
  const orderId = order.id;

  const orderItems = normalizedCart.map((cartItem) => {
    const item = availableItems.find(
      (availableItem) => availableItem.id === cartItem.countryItemId,
    );
    const unitPrice = resolveCheckoutPrice(item, cartItem.unitPrice);

    return {
      order_id: orderId,
      country_item_id: cartItem.countryItemId,
      product_id: item?.product_id,
      product_name: item?.products?.name ?? "Product",
      quantity: cartItem.quantity,
      unit_price: unitPrice,
      total: unitPrice * cartItem.quantity,
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    return {
      ok: false,
      error: itemsError.message
        ? `Order was created but items could not be saved: ${itemsError.message}`
        : "Order was created but items could not be saved. Please contact support.",
    };
  }

  await notifyOrderCreated({
    items: orderItems.map((item) => ({
      id: `${orderId}-${item.country_item_id}`,
      order_id: orderId,
      country_item_id: item.country_item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    })),
    order: {
      address_line: fullAddress,
      countries: {
        currency_code: country.currency_code,
        currency_symbol: country.currency_symbol,
      },
      country_id: countryId,
      currency_code: country.currency_code,
      customer_email: email,
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: phone,
      id: orderId,
      notes,
      order_number: orderNumber,
      payment_method: "COD",
      shipping_area_name: country.use_shipping_zones
        ? (shippingZone?.name ?? city)
        : city,
      shipping_fee: shippingFee,
      status: "pending",
      subtotal,
      total,
    },
  }).catch((error) => {
    console.error("Order notification failed", error);
  });

  revalidatePath("/admin/orders");
  return { ok: true, orderNumber };
}

function requiredText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function resolveCheckoutPrice(
  item: CheckoutCountryItem | undefined,
  fallbackPrice: number,
) {
  const databasePrice = resolveItemPrice(item);

  if (databasePrice > 0) {
    return databasePrice;
  }

  return Number.isFinite(fallbackPrice) && fallbackPrice > 0 ? fallbackPrice : 0;
}

function makeOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `HB-${stamp}-${suffix}`;
}
