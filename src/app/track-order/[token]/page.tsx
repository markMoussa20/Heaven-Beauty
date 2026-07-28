import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderTrackingView } from "@/components/tracking/OrderTrackingView";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem } from "@/types/database";

export const metadata: Metadata = {
  title: "Order status | Heaven Beauty",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

export default async function OrderTrackingDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const parsed = z.string().uuid().safeParse((await params).token);
  if (!parsed.success) notFound();

  const supabase = createAdminClient();
  const { data: rawOrder, error: orderError } = await supabase
    .from("orders")
    .select("*, countries(name,currency_code,currency_symbol)")
    .eq("public_tracking_token", parsed.data)
    .maybeSingle();

  if (orderError || !rawOrder) notFound();
  const order = rawOrder as Order & {
    countries?: {
      currency_code?: string | null;
      currency_symbol?: string | null;
      name?: string | null;
    } | null;
  };

  const { data: rawItems } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  return (
    <OrderTrackingView
      items={(rawItems ?? []) as OrderItem[]}
      order={order}
    />
  );
}
