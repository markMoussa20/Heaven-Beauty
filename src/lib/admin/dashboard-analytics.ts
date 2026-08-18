import "server-only";

import { orderStatusLabel } from "@/lib/orders/statuses";
import { createAdminClient } from "@/lib/supabase/admin";

type DashboardOrder = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  total?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  currency_code?: string | null;
  country_id?: string | null;
  countries?: {
    name?: string | null;
    currency_code?: string | null;
    currency_symbol?: string | null;
  } | null;
};

export const DASHBOARD_RANGE_PRESETS = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "month", label: "This month", days: 0 },
  { key: "all", label: "All time", days: 0 },
] as const;

export type DashboardRangeKey =
  | (typeof DASHBOARD_RANGE_PRESETS)[number]["key"]
  | "custom";

export type DashboardRangeInput = {
  range?: string;
  from?: string;
  to?: string;
};

export type ResolvedRange = {
  key: DashboardRangeKey;
  label: string;
  fromISO: string;
  toISO: string;
  /** Inclusive calendar dates, for prefilling the custom date inputs. */
  fromDate: string;
  toDate: string;
  granularity: "day" | "week";
};

export type DashboardAnalytics = {
  activeCountries: number;
  activeProducts: number;
  countries: Array<{ label: string; value: number }>;
  customers: number;
  dailyOrders: Array<{ date: string; label: string; value: number }>;
  error: string | null;
  pendingOrders: number;
  range: ResolvedRange;
  rangeOrders: number;
  recentOrders: Array<{
    country: string;
    customer: string;
    date: string;
    href: string;
    orderNumber: string;
    status: string;
    total: string;
  }>;
  revenueByCurrency: Array<{ currency: string; formatted: string; value: number }>;
  statuses: Array<{ label: string; status: string; value: number }>;
  totalOrders: number;
  truncated: boolean;
};

const DAY_MS = 86_400_000;
const MAX_ORDER_ROWS = 5000;

function startOfUTCDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parseDateParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countryFromOrder(order: DashboardOrder) {
  return order.countries?.name ?? "Unknown country";
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      currency,
      maximumFractionDigits: 2,
      style: "currency",
    }).format(value);
  } catch {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

/**
 * Turns the dashboard query string into a concrete window. `earliestOrder`
 * only matters for "All time"; every other preset is relative to today.
 */
export function resolveDashboardRange(
  input: DashboardRangeInput,
  earliestOrder?: Date | null,
): ResolvedRange {
  const today = startOfUTCDay(new Date());
  // The window end is exclusive, so orders placed today are always included.
  const exclusiveEnd = new Date(today.getTime() + DAY_MS);

  const customFrom = parseDateParam(input.from);
  const customTo = parseDateParam(input.to);

  let key: DashboardRangeKey;
  let from: Date;
  let to = exclusiveEnd;
  let label: string;

  if (customFrom || customTo) {
    key = "custom";
    from = customFrom ?? startOfUTCDay(earliestOrder ?? today);
    to = customTo ? new Date(customTo.getTime() + DAY_MS) : exclusiveEnd;
    if (from >= to) {
      const swapped = new Date(to.getTime() - DAY_MS);
      to = new Date(from.getTime() + DAY_MS);
      from = swapped;
    }
    label = "Custom range";
  } else {
    const preset =
      DASHBOARD_RANGE_PRESETS.find((option) => option.key === input.range) ??
      DASHBOARD_RANGE_PRESETS[1];
    key = preset.key;
    label = preset.label;
    if (preset.key === "month") {
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    } else if (preset.key === "all") {
      from = startOfUTCDay(earliestOrder ?? new Date(today.getTime() - 29 * DAY_MS));
    } else {
      from = new Date(today.getTime() - (preset.days - 1) * DAY_MS);
    }
  }

  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));

  return {
    key,
    label,
    fromISO: from.toISOString(),
    toISO: to.toISOString(),
    fromDate: from.toISOString().slice(0, 10),
    toDate: new Date(to.getTime() - DAY_MS).toISOString().slice(0, 10),
    // Beyond a quarter, one bar per day is unreadable, so switch to weeks.
    granularity: spanDays <= 92 ? "day" : "week",
  };
}

export async function getDashboardAnalytics(
  input: DashboardRangeInput = {},
): Promise<DashboardAnalytics> {
  const supabase = createAdminClient();

  // "All time" and custom ranges need a floor, so find the oldest order first.
  let earliestOrder: Date | null = null;
  if (input.range === "all" || input.from || input.to) {
    const { data } = await supabase
      .from("orders")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const createdAt = (data as { created_at?: string } | null)?.created_at;
    if (createdAt) earliestOrder = new Date(createdAt);
  }

  const range = resolveDashboardRange(input, earliestOrder);

  const [
    ordersResult,
    totalOrdersResult,
    pendingOrdersResult,
    customersResult,
    countriesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_number,customer_name,total,status,created_at,currency_code,country_id,countries(name,currency_code,currency_symbol)",
      )
      .gte("created_at", range.fromISO)
      .lt("created_at", range.toISO)
      .order("created_at", { ascending: false })
      .limit(MAX_ORDER_ROWS),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed", "processing"]),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("countries")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const firstError = [
    ordersResult.error,
    totalOrdersResult.error,
    pendingOrdersResult.error,
    customersResult.error,
    countriesResult.error,
    productsResult.error,
  ].find(Boolean);
  const orders = (ordersResult.data ?? []) as DashboardOrder[];

  const from = new Date(range.fromISO);
  const to = new Date(range.toISO);
  const bucketMs = range.granularity === "week" ? DAY_MS * 7 : DAY_MS;
  const bucketCount = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / bucketMs),
  );
  const dayFormatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(from.getTime() + index * bucketMs);
    return {
      date: start.toISOString().slice(0, 10),
      label: dayFormatter.format(start),
      value: 0,
    };
  });

  const statuses = new Map<string, number>();
  const countries = new Map<string, number>();
  const revenueByCurrency = new Map<string, number>();

  for (const order of orders) {
    if (order.created_at) {
      const index = Math.floor(
        (new Date(order.created_at).getTime() - from.getTime()) / bucketMs,
      );
      if (index >= 0 && index < buckets.length) buckets[index].value += 1;
    }

    const status = order.status?.toLowerCase() || "pending";
    statuses.set(status, (statuses.get(status) ?? 0) + 1);

    const country = countryFromOrder(order);
    countries.set(country, (countries.get(country) ?? 0) + 1);

    const currency = order.countries?.currency_code ?? order.currency_code ?? "USD";
    revenueByCurrency.set(
      currency,
      (revenueByCurrency.get(currency) ?? 0) + Number(order.total ?? 0),
    );
  }

  return {
    activeCountries: countriesResult.count ?? 0,
    activeProducts: productsResult.count ?? 0,
    countries: [...countries]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    customers: customersResult.count ?? 0,
    dailyOrders: buckets,
    error: firstError?.message ?? null,
    pendingOrders: pendingOrdersResult.count ?? 0,
    range,
    rangeOrders: orders.length,
    recentOrders: orders.slice(0, 6).map((order) => {
      const currency = order.countries?.currency_code ?? order.currency_code ?? "USD";
      return {
        country: countryFromOrder(order),
        customer: order.customer_name ?? "Customer",
        date: order.created_at ? dayFormatter.format(new Date(order.created_at)) : "-",
        href: `/admin/orders/${order.id}`,
        orderNumber: order.order_number ?? order.id,
        status: orderStatusLabel(order.status),
        total: formatMoney(Number(order.total ?? 0), currency),
      };
    }),
    revenueByCurrency: [...revenueByCurrency]
      .map(([currency, value]) => ({
        currency,
        formatted: formatMoney(value, currency),
        value,
      }))
      .sort((a, b) => b.value - a.value),
    statuses: [...statuses]
      .map(([status, value]) => ({
        label: orderStatusLabel(status),
        status,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    totalOrders: totalOrdersResult.count ?? 0,
    truncated: orders.length >= MAX_ORDER_ROWS,
  };
}
