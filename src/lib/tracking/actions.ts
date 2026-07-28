"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const lookupSchema = z.object({
  contact: z.string().trim().min(3).max(254),
  orderNumber: z.string().trim().min(3).max(80),
});

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function errorRedirect(code: "invalid" | "not-found"): never {
  redirect(`/track-order?error=${code}`);
}

export async function lookupOrder(formData: FormData) {
  const parsed = lookupSchema.safeParse({
    contact: formData.get("contact"),
    orderNumber: formData.get("order_number"),
  });

  if (!parsed.success) errorRedirect("invalid");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("customer_email, customer_phone, public_tracking_token")
    .eq("order_number", parsed.data.orderNumber.toUpperCase())
    .maybeSingle();

  if (error || !data) errorRedirect("not-found");
  const order = data as {
    customer_email?: string | null;
    customer_phone?: string | null;
    public_tracking_token?: string | null;
  };

  const contact = parsed.data.contact;
  const emailMatches =
    normalizeEmail(contact) !== "" &&
    normalizeEmail(contact) === normalizeEmail(order.customer_email);
  const normalizedPhone = normalizePhone(contact);
  const phoneMatches =
    normalizedPhone.length >= 5 &&
    normalizedPhone === normalizePhone(order.customer_phone);

  if ((!emailMatches && !phoneMatches) || !order.public_tracking_token) {
    errorRedirect("not-found");
  }

  redirect(`/track-order/${order.public_tracking_token}`);
}
