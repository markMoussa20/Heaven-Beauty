import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWakilniWebhookSecrets } from "@/lib/wakilni/client";

type WakilniWebhook = {
  event_id?: string;
  event?: string;
  timestamp?: string;
  data?: {
    order_id?: number;
    waybill?: string;
    new_status?: string;
    new_status_code?: number;
    updated_at?: string;
  };
};

function validSignature(rawBody: string, supplied: string | null, secret: string) {
  if (!supplied) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const webhookSecrets = await getWakilniWebhookSecrets();
  if (!webhookSecrets.length) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const suppliedSignature = request.headers.get("x-webhook-signature");
  const matchedAccount = webhookSecrets.find(({ secret }) =>
    validSignature(rawBody, suppliedSignature, secret),
  );
  if (!matchedAccount) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: WakilniWebhook;
  try {
    event = JSON.parse(rawBody) as WakilniWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!event.event_id) return NextResponse.json({ error: "Missing event_id." }, { status: 400 });

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("wakilni_webhook_events")
    .select("id")
    .eq("event_id", event.event_id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const waybill = event.data?.waybill;
  let orderId: string | null = null;
  if (waybill) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", waybill)
      .maybeSingle();
    orderId = (order as { id?: string } | null)?.id ?? null;
  }
  if (!orderId && event.data?.order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("wakilni_order_id", event.data.order_id)
      .maybeSingle();
    orderId = (order as { id?: string } | null)?.id ?? null;
  }

  const { error: insertError } = await supabase.from("wakilni_webhook_events").insert({
    event_id: event.event_id,
    order_id: orderId,
    topic: request.headers.get("x-webhook-topic") || event.event || "unknown",
    delivery_id: request.headers.get("x-webhook-delivery-id"),
    attempt_number: Number(request.headers.get("x-attempt-number") || 1),
    payload: event,
    country_code: matchedAccount.countryCode,
  } as never);
  if (insertError) {
    console.error("Could not store Wakilni webhook", insertError);
    return NextResponse.json({ error: "Could not persist event." }, { status: 500 });
  }

  if (orderId) {
    const status = event.data?.new_status || event.event || "Updated";
    const statusCode = event.data?.new_status_code;
    await supabase
      .from("orders")
      .update({
        wakilni_status: status,
        wakilni_status_code: statusCode ?? null,
        wakilni_sync_status: "synced",
        wakilni_updated_at: event.data?.updated_at || event.timestamp || new Date().toISOString(),
      } as never)
      .eq("id", orderId);
  }

  return NextResponse.json({ ok: true });
}
