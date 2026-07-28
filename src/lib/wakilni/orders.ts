import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem } from "@/types/database";
import {
  getWakilniCountryConfig,
  getWakilniToken,
  wakilniRequest,
  WakilniError,
} from "./client";

type OrderWithCountry = Order & { countries?: { code?: string | null } | null };
type DeliveryResponse = Record<string, unknown> & {
  id?: number;
  delivery_id?: number;
  tracking_id?: string;
  tracking_url?: string;
};

function referenceId(value: string) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 7);
  return Number.parseInt(hex, 16);
}

function errorMessage(error: unknown) {
  if (error instanceof WakilniError) {
    const details = error.response ? ` ${JSON.stringify(error.response)}` : "";
    return `${error.message}${details}`.slice(0, 4000);
  }
  return error instanceof Error ? error.message.slice(0, 4000) : "Unknown Wakilni error.";
}

async function updateOrder(orderId: string, payload: Record<string, unknown>) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("orders").update(payload as never).eq("id", orderId);
  if (error) console.error("Could not update Wakilni order state", { orderId, error });
}

async function logAttempt(orderId: string, status: string, message: string, response?: unknown) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("wakilni_sync_logs").insert({
    order_id: orderId,
    status,
    message,
    response,
  } as never);
  if (error) console.error("Could not write Wakilni sync log", { orderId, error });
}

export async function submitOrderToWakilni(orderId: string) {
  const supabase = createAdminClient();
  const [{ data: rawOrder, error: orderError }, { data: rawItems, error: itemsError }] =
    await Promise.all([
      supabase.from("orders").select("*, countries(code)").eq("id", orderId).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
    ]);

  const order = rawOrder as OrderWithCountry | null;
  const items = (rawItems ?? []) as OrderItem[];
  if (orderError || itemsError || !order) throw new Error("The local order could not be loaded.");
  const countryCode = order.countries?.code;
  if (!countryCode) throw new WakilniError("The order country code is missing.");
  const account = await getWakilniCountryConfig(countryCode);
  if (!account) return { skipped: true as const, reason: "country_disabled" };
  if (
    (order.wakilni_tracking_id || order.wakilni_order_id) &&
    ["submitted", "synced"].includes(order.wakilni_sync_status || "")
  ) {
    return { skipped: true as const, reason: "already_submitted" };
  }

  await updateOrder(orderId, {
    wakilni_sync_status: "submitting",
    wakilni_last_error: null,
    wakilni_last_attempt_at: new Date().toISOString(),
  });

  try {
    const token = await getWakilniToken(account);
    let bulkId = Number(order.wakilni_bulk_id);
    if (!Number.isFinite(bulkId) || bulkId <= 0) {
      const bulk = await wakilniRequest(account, "/api/v2/clients/start_bulk", {
        token,
        body: {
          location_id: account.pickupLocationId,
          longitude: account.pickupLongitude,
          latitude: account.pickupLatitude,
          floor: account.pickupFloor ?? 0,
          area: account.pickupArea,
        },
      });
      bulkId = Number(bulk.bulk_id);
      if (!Number.isFinite(bulkId)) {
        throw new WakilniError("Start bulk did not return a bulk_id.", undefined, bulk);
      }
      await updateOrder(orderId, { wakilni_bulk_id: bulkId, wakilni_sync_status: "bulk_open" });
    }

    let delivery: DeliveryResponse;
    if (order.wakilni_order_id || order.wakilni_tracking_id) {
      delivery = {
        id: order.wakilni_order_id ?? undefined,
        tracking_id: order.wakilni_tracking_id ?? undefined,
        tracking_url: order.wakilni_tracking_url ?? undefined,
      };
    } else {
      delivery = (await wakilniRequest(account, `/api/v2/clients/add_delivery/${bulkId}`, {
        token,
        body: {
        get_order_details: true,
        get_barcode: false,
        waybill: order.order_number || order.id,
        receiver_id: referenceId(order.customer_id || order.customer_phone || order.id),
        receiver_first_name: (order.customer_name || "Customer").trim().split(/\s+/)[0],
        receiver_last_name: (order.customer_name || "").trim().split(/\s+/).slice(1).join(" ") || "-",
        receiver_phone_number: order.customer_phone || "",
        receiver_gender: account.defaultReceiverGender ?? 1,
        receiver_email: order.customer_email || "",
        receiver_secondary_phone_number: "",
        receiver_location_id: referenceId(`${order.customer_id || order.id}:${order.address_line || order.address || ""}`),
        receiver_longitude: 0,
        receiver_latitude: 0,
        receiver_building: order.address_line || order.address || order.city || "",
        receiver_floor: 0,
        receiver_directions: [order.apartment, order.city, order.notes].filter(Boolean).join(", "),
        receiver_area: order.shipping_area_name || order.shipping_area || order.city || "",
        currency: account.currencyId,
        cash_collection_type_id: account.cashCollectionTypeId ?? 52,
        collection_amount:
          (account.cashCollectionTypeId ?? 52) === 54 ? 0 : Number(order.total ?? 0),
        note: order.notes || "",
        car_needed: false,
        is_express: account.express ?? false,
        packages: items.map((item) => ({
          quantity: item.quantity,
          type_id: account.packageTypeId ?? 58,
          name: item.product_name || "Beauty product",
          sku: item.product_id || item.country_item_id,
        })),
        },
      })) as DeliveryResponse;
      await updateOrder(orderId, {
        wakilni_order_id: delivery.id ?? delivery.delivery_id ?? null,
        wakilni_tracking_id: delivery.tracking_id ?? null,
        wakilni_tracking_url: delivery.tracking_url ?? null,
        wakilni_sync_status: "delivery_added",
      });
    }

    await wakilniRequest(account, `/api/v2/clients/end_bulk/${bulkId}`, { token, body: {} });
    const wakilniOrderId = delivery.id ?? delivery.delivery_id;
    await updateOrder(orderId, {
      wakilni_bulk_id: bulkId,
      wakilni_order_id: wakilniOrderId ?? null,
      wakilni_tracking_id: delivery.tracking_id ?? null,
      wakilni_tracking_url: delivery.tracking_url ?? null,
      wakilni_sync_status: "submitted",
      wakilni_status: "Pending",
      wakilni_status_code: 1,
      wakilni_submitted_at: new Date().toISOString(),
      wakilni_last_error: null,
    });
    await logAttempt(orderId, "submitted", "Order submitted to Wakilni.", delivery);
    return { skipped: false as const, bulkId, delivery };
  } catch (error) {
    const message = errorMessage(error);
    await updateOrder(orderId, { wakilni_sync_status: "failed", wakilni_last_error: message });
    await logAttempt(orderId, "failed", message);
    throw error;
  }
}
