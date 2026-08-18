import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { orderStatusLabel } from "@/lib/orders/statuses";

/**
 * Export queries deliberately mirror the filters on the admin list screens so
 * that "export" always means "what I am currently looking at".
 */
export type OrderExportFilters = {
  q?: string;
  country_id?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type CustomerExportFilters = {
  q?: string;
  country_id?: string;
};

const MAX_EXPORT_ROWS = 10_000;

export type OrderExportRow = {
  orderNumber: string;
  createdAt: Date | null;
  customerName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  area: string;
  address: string;
  status: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  itemCount: number;
  wakilniTracking: string;
  wakilniStatus: string;
  notes: string;
};

export type OrderItemExportRow = {
  orderNumber: string;
  createdAt: Date | null;
  product: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
};

export type CustomerExportRow = {
  name: string;
  email: string;
  phone: string;
  country: string;
  createdAt: Date | null;
  orderCount: number;
  totalSpend: number;
  currency: string;
  lastOrderAt: Date | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

type RawOrder = Record<string, unknown> & {
  id: string;
  countries?: { name?: string | null; currency_code?: string | null } | null;
};

export async function getOrdersForExport(filters: OrderExportFilters) {
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select("*, countries(name,currency_code)")
    .order("created_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (filters.country_id) query = query.eq("country_id", filters.country_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) {
    // `to` is an inclusive calendar day, so extend to the end of that day.
    const end = new Date(`${filters.to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }
  if (filters.q) {
    query = query.or(
      ["order_number", "customer_phone", "customer_name", "customer_email"]
        .map((column) => `${column}.ilike.%${filters.q}%`)
        .join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Orders could not be exported: ${error.message}`);

  const orders = (data ?? []) as RawOrder[];
  const orderIds = orders.map((order) => order.id);

  // One follow-up query for the line items of exactly the exported orders.
  const items: Array<Record<string, unknown>> = [];
  for (let index = 0; index < orderIds.length; index += 200) {
    const slice = orderIds.slice(index, index + 200);
    if (!slice.length) break;
    const { data: itemRows, error: itemsError } = await supabase
      .from("order_items")
      .select("*, products(name)")
      .in("order_id", slice);
    if (itemsError) {
      throw new Error(`Order items could not be exported: ${itemsError.message}`);
    }
    items.push(...((itemRows ?? []) as Array<Record<string, unknown>>));
  }

  const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const key = String(item.order_id);
    const bucket = itemsByOrder.get(key);
    if (bucket) bucket.push(item);
    else itemsByOrder.set(key, [item]);
  }

  const orderRows: OrderExportRow[] = orders.map((order) => {
    const currency =
      text(order.countries?.currency_code) || text(order.currency_code) || "";
    const lines = itemsByOrder.get(order.id) ?? [];
    return {
      orderNumber: text(order.order_number) || order.id,
      createdAt: toDate(order.created_at),
      customerName: text(order.customer_name),
      phone: text(order.customer_phone),
      email: text(order.customer_email),
      country: text(order.countries?.name),
      city: text(order.city),
      area: text(order.shipping_area_name) || text(order.shipping_area),
      address: [text(order.address_line) || text(order.address), text(order.apartment)]
        .filter(Boolean)
        .join(", "),
      status: orderStatusLabel(text(order.status)),
      currency,
      subtotal: toNumber(order.subtotal),
      shippingFee: toNumber(order.shipping_fee),
      total: toNumber(order.total),
      itemCount: lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
      wakilniTracking: text(order.wakilni_tracking_id),
      wakilniStatus: text(order.wakilni_status),
      notes: text(order.notes),
    };
  });

  const orderMeta = new Map(
    orderRows.map((row, index) => [orders[index].id, row]),
  );

  const itemRows: OrderItemExportRow[] = items
    .map((item) => {
      const parent = orderMeta.get(String(item.order_id));
      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.unit_price);
      const products = item.products as { name?: string | null } | null;
      return {
        orderNumber: parent?.orderNumber ?? String(item.order_id),
        createdAt: parent?.createdAt ?? null,
        product: text(item.product_name) || text(products?.name),
        quantity,
        unitPrice,
        lineTotal: item.total == null ? quantity * unitPrice : toNumber(item.total),
        currency: parent?.currency ?? "",
      };
    })
    .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));

  return { orderRows, itemRows, truncated: orders.length >= MAX_EXPORT_ROWS };
}

export async function getCustomersForExport(filters: CustomerExportFilters) {
  const supabase = createAdminClient();

  let query = supabase
    .from("customers")
    .select("*, countries(name,currency_code)")
    .order("created_at", { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (filters.country_id) query = query.eq("country_id", filters.country_id);
  if (filters.q) {
    query = query.or(
      ["full_name", "phone", "email"]
        .map((column) => `${column}.ilike.%${filters.q}%`)
        .join(","),
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Customers could not be exported: ${error.message}`);

  const customers = (data ?? []) as Array<
    Record<string, unknown> & {
      id: string;
      countries?: { name?: string | null; currency_code?: string | null } | null;
    }
  >;

  // Order history per customer, so the sheet carries spend rather than
  // just contact details.
  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select("customer_id,total,created_at,status")
    .limit(MAX_EXPORT_ROWS);
  if (ordersError) {
    throw new Error(`Customer order history failed: ${ordersError.message}`);
  }

  const history = new Map<string, { count: number; spend: number; last: Date | null }>();
  for (const order of (orderRows ?? []) as Array<Record<string, unknown>>) {
    const key = text(order.customer_id);
    if (!key) continue;
    const entry = history.get(key) ?? { count: 0, spend: 0, last: null };
    entry.count += 1;
    // Cancelled orders are counted but not billed as spend.
    if (text(order.status).toLowerCase() !== "cancelled") {
      entry.spend += toNumber(order.total);
    }
    const created = toDate(order.created_at);
    if (created && (!entry.last || created > entry.last)) entry.last = created;
    history.set(key, entry);
  }

  const rows: CustomerExportRow[] = customers.map((customer) => {
    const entry = history.get(customer.id) ?? { count: 0, spend: 0, last: null };
    return {
      name: text(customer.full_name),
      email: text(customer.email),
      phone: text(customer.phone),
      country: text(customer.countries?.name),
      createdAt: toDate(customer.created_at),
      orderCount: entry.count,
      totalSpend: entry.spend,
      currency: text(customer.countries?.currency_code),
      lastOrderAt: entry.last,
    };
  });

  return { rows, truncated: customers.length >= MAX_EXPORT_ROWS };
}
