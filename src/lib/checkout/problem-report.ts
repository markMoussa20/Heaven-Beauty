import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { sendStaffAlertEmail } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCheckoutProblemEmail, type CheckoutProblem } from "@/lib/checkout/problem-email";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COUNTRY_TIME_ZONES: Record<string, string> = {
  AE: "Asia/Dubai",
  EG: "Africa/Cairo",
  JO: "Asia/Amman",
  LB: "Asia/Beirut",
};

// The report endpoint is public, so cap how many emails it can cause. Kept in
// memory on purpose (no database writes); limits are per server instance.
const PER_VISITOR_LIMIT = 5;
const PER_VISITOR_WINDOW_MS = 10 * 60 * 1000;
const PER_INSTANCE_HOURLY_LIMIT = 40;
const sentByVisitor = new Map<string, number[]>();
let sentThisHour: number[] = [];

/** A salted hash of the caller's IP: identifies repeat callers without storing the IP. */
export async function getRequestFingerprint() {
  const requestHeaders = await headers();
  const source =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("cf-connecting-ip") ||
    "unknown";
  const secret =
    process.env.CHECKOUT_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "checkout";
  return createHash("sha256").update(`${secret}:${source}`).digest("hex");
}

/** Records a send if allowed; false when this visitor or instance is over its limit. */
export function allowProblemEmail(fingerprint: string, now = Date.now()) {
  sentThisHour = sentThisHour.filter((time) => now - time < 60 * 60 * 1000);
  const recent = (sentByVisitor.get(fingerprint) ?? []).filter(
    (time) => now - time < PER_VISITOR_WINDOW_MS,
  );
  if (recent.length >= PER_VISITOR_LIMIT || sentThisHour.length >= PER_INSTANCE_HOURLY_LIMIT) {
    sentByVisitor.set(fingerprint, recent);
    return false;
  }
  recent.push(now);
  sentByVisitor.set(fingerprint, recent);
  sentThisHour.push(now);
  if (sentByVisitor.size > 5000) sentByVisitor.clear();
  return true;
}

type LooseResult = { data: unknown };
type LooseQuery = PromiseLike<LooseResult> & {
  eq: (column: string, value: unknown) => LooseQuery;
  in: (column: string, values: unknown[]) => LooseQuery;
  maybeSingle: () => Promise<LooseResult>;
  select: (columns: string) => LooseQuery;
};

/**
 * Emails order-alert staff about a failed checkout attempt. Call it from
 * after() so the shopper's response is never delayed by SMTP.
 */
export async function emailCheckoutProblem({
  customerMessage,
  fingerprint,
  formData,
  problems,
}: {
  customerMessage: string;
  fingerprint: string;
  formData: FormData;
  problems: CheckoutProblem[];
}) {
  if (problems.length === 0 || !allowProblemEmail(fingerprint)) return;

  try {
    const text = (name: string, max = 300) => String(formData.get(name) ?? "").trim().slice(0, max);
    const countryId = text("country_id");
    const zoneId = text("shipping_zone_id");
    const lines = readCartLines(formData);

    const supabase = createAdminClient() as unknown as { from: (table: string) => LooseQuery };
    const [country, zone, items] = await Promise.all([
      UUID.test(countryId)
        ? supabase.from("countries").select("name,code").eq("id", countryId).maybeSingle()
        : Promise.resolve({ data: null }),
      UUID.test(zoneId)
        ? supabase.from("shipping_zones").select("name").eq("id", zoneId).maybeSingle()
        : Promise.resolve({ data: null }),
      lines.length
        ? supabase.from("country_items").select("id,products(name)").in("id", lines.map((line) => line.id))
        : Promise.resolve({ data: [] }),
    ]);

    const countryRow = country.data as { name?: string; code?: string } | null;
    const productNames = new Map(
      ((items.data ?? []) as { id: string; products?: { name?: string } | null }[]).map((row) => [
        row.id,
        row.products?.name ?? "Unknown product",
      ]),
    );

    const email = buildCheckoutProblemEmail({
      problems,
      customerMessage,
      customer: {
        firstName: text("first_name", 80),
        lastName: text("last_name", 80),
        phone: text("phone", 40),
        email: text("email", 254),
        address: text("address"),
        apartment: text("apartment", 100),
        city: text("city", 100),
        governorate: (zone.data as { name?: string } | null)?.name ?? "",
        postalCode: text("postal_code", 30),
        notes: text("notes", 1000),
      },
      countryName: countryRow?.name ?? "Unknown country",
      cart: lines.map((line) => ({
        name: productNames.get(line.id) ?? "Unknown product",
        quantity: line.quantity,
      })),
      occurredAt: new Date(),
      timeZone: COUNTRY_TIME_ZONES[countryRow?.code ?? ""] ?? "UTC",
    });

    await sendStaffAlertEmail(email);
  } catch (error) {
    console.error(
      `Checkout problem email could not be prepared: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

function readCartLines(formData: FormData) {
  try {
    const parsed = JSON.parse(String(formData.get("cart_items") ?? "[]")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, 50)
      .map((line) => line as { countryItemId?: unknown; quantity?: unknown })
      .filter((line) => typeof line.countryItemId === "string" && UUID.test(line.countryItemId))
      .map((line) => ({
        id: line.countryItemId as string,
        quantity: Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0,
      }));
  } catch {
    return [];
  }
}
