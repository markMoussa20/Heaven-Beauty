import "server-only";

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

export type DashboardAnalytics = {
  activeCountries: number;
  activeProducts: number;
  countries: Array<{ label: string; value: number }>;
  customers: number;
  dailyOrders: Array<{ date: string; label: string; value: number }>;
  error: string | null;
  pendingOrders: number;
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
  thirtyDayOrders: number;
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const supabase = createAdminClient();
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);

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
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
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

  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(date),
      value: 0,
    };
  });
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const statuses = new Map<string, number>();
  const countries = new Map<string, number>();
  const revenueByCurrency = new Map<string, number>();

  for (const order of orders) {
    const date = order.created_at?.slice(0, 10);
    const day = date ? dayByDate.get(date) : null;
    if (day) day.value += 1;

    const status = order.status?.toLowerCase() || "pending";
    statuses.set(status, (statuses.get(status) ?? 0) + 1);

    const country = countryFromOrder(order);
    countries.set(country, (countries.get(country) ?? 0) + 1);

    const currency =
      order.countries?.currency_code ?? order.currency_code ?? "USD";
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
    dailyOrders: days,
    error: firstError?.message ?? null,
    pendingOrders: pendingOrdersResult.count ?? 0,
    recentOrders: orders.slice(0, 6).map((order) => {
      const currency =
        order.countries?.currency_code ?? order.currency_code ?? "USD";
      return {
        country: countryFromOrder(order),
        customer: order.customer_name ?? "Customer",
        date: order.created_at
          ? new Intl.DateTimeFormat("en", {
              day: "numeric",
              month: "short",
            }).format(new Date(order.created_at))
          : "—",
        href: `/admin/orders/${order.id}`,
        orderNumber: order.order_number ?? order.id,
        status: statusLabels[order.status?.toLowerCase() ?? ""] ?? order.status ?? "Pending",
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
        label: statusLabels[status] ?? status.replaceAll("_", " "),
        status,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    thirtyDayOrders: orders.length,
    totalOrders: totalOrdersResult.count ?? 0,
  };
}

