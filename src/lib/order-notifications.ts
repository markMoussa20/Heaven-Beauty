import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Order,
  OrderItem,
  OrderNotificationRecipient,
  OrderNotificationSettings,
  OrderNotificationTemplate,
} from "@/types/database";

type NotificationOrder = Order & {
  countries?: { currency_code?: string | null; currency_symbol?: string | null } | null;
};

type NotifyOrderCreatedInput = {
  order: NotificationOrder;
  items: OrderItem[];
};

type QueryResult = { data: unknown; error: { message: string } | null };

type LooseQuery = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => LooseQuery;
  insert: (payload: unknown) => Promise<{ error: { message: string } | null }>;
  limit: (count: number) => LooseQuery;
  maybeSingle: () => Promise<QueryResult>;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  select: (columns?: string) => LooseQuery;
};

type LooseSupabase = {
  from: (table: string) => LooseQuery;
};

type TemplateContext = Record<string, string>;

const defaultSettings: Partial<OrderNotificationSettings> = {
  is_active: true,
  customer_email_enabled: true,
  internal_email_enabled: true,
  sms_enabled: false,
  sender_name: "Heaven Beauty",
  sender_email: "service@myheavenbeauty.com",
  reply_to_email: "service@myheavenbeauty.com",
  gmail_user: "service@myheavenbeauty.com",
  smtp_host: "smtp.gmail.com",
  smtp_port: 465,
  smtp_secure: true,
  callmebot_endpoint_template:
    "https://api.callmebot.com/whatsapp.php?phone={phone}&text={message}&apikey={apiKey}",
};

const defaultTemplates: Record<string, OrderNotificationTemplate> = {
  customer_order_confirmation: {
    id: "customer_order_confirmation",
    key: "customer_order_confirmation",
    subject: "Your Heaven Beauty order {orderNumber} is confirmed",
    body: `Hi {customerName},

Thank you for shopping with Heaven Beauty. Your order {orderNumber} is confirmed, and our team is preparing it with care.

Order summary:
{itemsText}

Subtotal: {subtotal}
Delivery: {shippingFee}
Total: {total}

Delivery address:
{addressLine}
{shippingAreaName}

We will contact you if we need any extra delivery details.

With love,
Heaven Beauty`,
    is_active: true,
  },
  internal_order_alert: {
    id: "internal_order_alert",
    key: "internal_order_alert",
    subject: "[Heaven Beauty] Order {orderNumber} placed by {customerName}",
    body: `New order {orderNumber}

Customer:
{customerName}
{customerPhone}
{customerEmail}

Order summary:
{itemsText}

Subtotal: {subtotal}
Shipping: {shippingFee}
Total: {total}

Delivery method:
{shippingAreaName}

Delivery address:
{customerName}
{addressLine}
{shippingAreaName}
{customerPhone}
{customerEmail}

Notes:
{notes}`,
    is_active: true,
  },
  sms_order_alert: {
    id: "sms_order_alert",
    key: "sms_order_alert",
    subject: "New Heaven Beauty order {orderNumber}",
    body: "New order {orderNumber}\n{customerName} - {customerPhone}\n{itemsCompactText}\nDelivery: {shippingAreaName}\nTotal: {total}",
    is_active: true,
  },
};

export async function notifyOrderCreated({ items, order }: NotifyOrderCreatedInput) {
  const supabase = createAdminClient() as unknown as LooseSupabase;
  const [settings, templates, recipients] = await Promise.all([
    getSettings(supabase),
    getTemplates(supabase),
    getRecipients(supabase),
  ]);

  if (!settings.is_active) {
    return;
  }

  const context = createTemplateContext(order, items);
  const jobs: Promise<void>[] = [];

  if (settings.customer_email_enabled && order.customer_email) {
    jobs.push(
      sendTemplatedEmail({
        context,
        orderId: order.id,
        recipient: order.customer_email,
        settings,
        supabase,
        template: templates.customer_order_confirmation,
      }),
    );
  }

  if (settings.internal_email_enabled) {
    for (const recipient of recipients) {
      if (recipient.email && recipient.is_active !== false && recipient.receive_order_email !== false) {
        jobs.push(
          sendTemplatedEmail({
            context,
            orderId: order.id,
            recipient: recipient.email,
            settings,
            supabase,
            template: templates.internal_order_alert,
          }),
        );
      }
    }
  }

  if (settings.sms_enabled) {
    jobs.push(
      sendCallMeBotMessage({
        context,
        orderId: order.id,
        settings,
        supabase,
        template: templates.sms_order_alert,
      }),
    );
  }

  await Promise.allSettled(jobs);
}

async function getSettings(supabase: LooseSupabase) {
  const { data } = await supabase
    .from("order_notification_settings")
    .select("*")
    .eq("key", "default")
    .maybeSingle();

  return { ...defaultSettings, ...((data ?? {}) as OrderNotificationSettings) };
}

async function getTemplates(supabase: LooseSupabase) {
  const { data } = await supabase
    .from("order_notification_templates")
    .select("*")
    .order("key");
  const templates = { ...defaultTemplates };

  for (const template of ((data ?? []) as OrderNotificationTemplate[])) {
    if (template.key in templates && template.is_active !== false) {
      templates[template.key] = template;
    }
  }

  return templates;
}

async function getRecipients(supabase: LooseSupabase) {
  const { data } = await supabase
    .from("order_notification_recipients")
    .select("*")
    .order("sort_order");

  return (data ?? []) as OrderNotificationRecipient[];
}

async function sendTemplatedEmail({
  context,
  orderId,
  recipient,
  settings,
  supabase,
  template,
}: {
  context: TemplateContext;
  orderId: string;
  recipient: string;
  settings: Partial<OrderNotificationSettings>;
  supabase: LooseSupabase;
  template: OrderNotificationTemplate;
}) {
  try {
    const renderedBody = renderTemplate(template.body ?? "", context);
    await sendGmailEmail({
      html: renderNotificationHtml(template.key, context, renderedBody),
      recipient,
      settings,
      subject: renderTemplate(template.subject ?? "", context),
      text: renderedBody,
    });
    await logNotification(supabase, {
      channel: "email",
      message: "Email sent.",
      orderId,
      recipient,
      status: "sent",
    });
  } catch (error) {
    await logNotification(supabase, {
      channel: "email",
      message: error instanceof Error ? error.message : "Email failed.",
      orderId,
      recipient,
      status: "failed",
    });
  }
}

async function sendGmailEmail({
  html,
  recipient,
  settings,
  subject,
  text,
}: {
  html: string;
  recipient: string;
  settings: Partial<OrderNotificationSettings>;
  subject: string;
  text: string;
}) {
  if (!settings.gmail_user || !settings.gmail_app_password) {
    throw new Error("Gmail user or app password is missing in notification settings.");
  }

  const nodemailer = await importOptionalNodemailer();
  const transport = nodemailer.createTransport({
    auth: {
      pass: settings.gmail_app_password,
      user: settings.gmail_user,
    },
    host: settings.smtp_host ?? "smtp.gmail.com",
    port: Number(settings.smtp_port ?? 465),
    secure: settings.smtp_secure !== false,
  });

  await transport.sendMail({
    from: `${settings.sender_name ?? "Heaven Beauty"} <${settings.sender_email ?? settings.gmail_user}>`,
    html,
    replyTo: settings.reply_to_email ?? settings.sender_email ?? settings.gmail_user,
    subject,
    text,
    to: recipient,
  });
}

async function importOptionalNodemailer() {
  try {
    const importModule = new Function("moduleName", "return import(moduleName)") as (
      moduleName: string,
    ) => Promise<{ default?: { createTransport: unknown }; createTransport?: unknown }>;
    const mailerModule = await importModule("nodemailer");
    return (mailerModule.default ?? mailerModule) as {
      createTransport: (options: unknown) => {
        sendMail: (message: unknown) => Promise<unknown>;
      };
    };
  } catch {
    throw new Error("Nodemailer is not installed. Run pnpm install before enabling Gmail emails.");
  }
}

async function sendCallMeBotMessage({
  context,
  orderId,
  settings,
  supabase,
  template,
}: {
  context: TemplateContext;
  orderId: string;
  settings: Partial<OrderNotificationSettings>;
  supabase: LooseSupabase;
  template: OrderNotificationTemplate;
}) {
  const apiKey = settings.callmebot_api_key?.trim();
  const phone = normalizeCallMeBotPhone(settings.callmebot_phone);
  const endpointTemplate = settings.callmebot_endpoint_template?.trim();

  if (!apiKey || !phone || !endpointTemplate) {
    await logNotification(supabase, {
      channel: "callmebot",
      message: "CallMeBot API key, phone, or endpoint template is missing.",
      orderId,
      recipient: phone ?? null,
      status: "skipped",
    });
    return;
  }

  const message = renderTemplate(template.body ?? "", context);
  const url = endpointTemplate
    .replaceAll("{apiKey}", encodeURIComponent(apiKey))
    .replaceAll("{phone}", encodeURIComponent(phone))
    .replaceAll("{message}", encodeURIComponent(message))
    .replaceAll("{text}", encodeURIComponent(message));

  try {
    const response = await fetch(url, { method: "GET" });
    const responseText = await response.text();
    const readableResponse = htmlToPlainText(responseText);
    const isCallMeBotError = /\berror\b|invalid|empty|not authorized|not allowed/i.test(
      readableResponse,
    );
    const isQueued = /queued|few seconds|message to:/i.test(readableResponse);

    await logNotification(supabase, {
      channel: "callmebot",
      message: response.ok
        ? readableResponse.slice(0, 500) || "CallMeBot message accepted."
        : `CallMeBot failed with ${response.status}: ${readableResponse.slice(0, 500)}`,
      orderId,
      recipient: phone,
      status: response.ok && !isCallMeBotError && isQueued ? "sent" : "failed",
    });
  } catch (error) {
    await logNotification(supabase, {
      channel: "callmebot",
      message: error instanceof Error ? error.message : "CallMeBot request failed.",
      orderId,
      recipient: phone,
      status: "failed",
    });
  }
}

function normalizeCallMeBotPhone(value: string | null | undefined) {
  return value?.replace(/[^\d]/g, "").trim();
}

function createTemplateContext(order: NotificationOrder, items: OrderItem[]) {
  const currencySymbol = order.countries?.currency_symbol ?? "";
  const currencyCode = order.countries?.currency_code ?? "";
  const formatMoney = (value: number | string | null | undefined) =>
    `${currencySymbol}${Number(value ?? 0).toFixed(2)}${currencySymbol ? "" : ` ${currencyCode}`}`.trim();
  const computedSubtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.total ?? Number(item.unit_price) * Number(item.quantity)),
    0,
  );
  const shippingFeeValue = Number(order.shipping_fee ?? 0);
  const subtotalValue = preferredMoneyValue(order.subtotal, computedSubtotal);
  const totalValue = preferredMoneyValue(
    order.total,
    subtotalValue + shippingFeeValue,
  );
  const itemsText = items
    .map(
      (item) =>
        `${item.product_name ?? "Product"}\n${formatMoney(item.unit_price)} x ${item.quantity}\n${formatMoney(item.total ?? Number(item.unit_price) * item.quantity)}`,
    )
    .join("\n\n");
  const itemsCompactText = items
    .map((item) => {
      const lineTotal = item.total ?? Number(item.unit_price) * Number(item.quantity);
      return `${item.quantity}x ${item.product_name ?? "Product"} (${formatMoney(lineTotal)})`;
    })
    .join("; ");

  return {
    addressLine: order.address_line ?? order.address ?? "",
    customerEmail: order.customer_email ?? "",
    customerName: order.customer_name ?? "",
    customerPhone: order.customer_phone ?? "",
    itemsCompactText,
    itemsText,
    notes: order.notes ?? "-",
    orderNumber: order.order_number ?? order.id,
    shippingAreaName: order.shipping_area_name ?? order.shipping_area ?? "",
    shippingFee: formatMoney(shippingFeeValue),
    subtotal: formatMoney(subtotalValue),
    total: formatMoney(totalValue),
  };
}

function preferredMoneyValue(
  storedValue: number | string | null | undefined,
  fallbackValue: number,
) {
  const parsed = Number(storedValue ?? 0);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallbackValue;
}

function renderTemplate(template: string, context: TemplateContext) {
  return Object.entries(context).reduce(
    (next, [key, value]) => next.replaceAll(`{${key}}`, value),
    template,
  );
}

function renderNotificationHtml(
  templateKey: string,
  context: TemplateContext,
  renderedText: string,
) {
  const isInternal = templateKey === "internal_order_alert";
  const title = isInternal ? "New order received" : "Your order is confirmed";
  const eyebrow = isInternal ? "Internal order alert" : "Heaven Beauty";
  const intro = isInternal
    ? `${context.customerName} placed a new Heaven Beauty order.`
    : `Hi ${context.customerName || "there"}, thank you for your order. We have received it and will prepare it with care.`;
  const itemRows = createItemRowsHtml(context.itemsText);
  const bodyHtml = textToHtml(renderedText);

  return `
    <div style="margin:0;padding:0;background:#e6ecf4;color:#171412;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        ${escapeHtml(title)} ${escapeHtml(context.orderNumber)} - ${escapeHtml(context.total)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#e6ecf4;">
        <tr>
          <td style="padding:34px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 18px;text-align:center;color:#6c93c4;font-size:26px;font-weight:300;letter-spacing:-0.03em;">
                  Heaven Beauty
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;border:1px solid rgba(108,147,196,0.18);">
                  <div style="padding:34px 34px 22px;border-bottom:1px solid #edf1f7;">
                    <div style="margin-bottom:16px;color:#7f9dd0;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">
                      ${escapeHtml(eyebrow)}
                    </div>
                    <h1 style="margin:0;color:#171412;font-size:30px;line-height:1.15;font-weight:500;">
                      ${escapeHtml(title)}
                    </h1>
                    <p style="margin:16px 0 0;color:#5d6470;font-size:15px;line-height:1.8;">
                      ${escapeHtml(intro)}
                    </p>
                  </div>

                  <div style="padding:26px 34px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:0 0 18px;color:#7f9dd0;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                          Order ${escapeHtml(context.orderNumber)}
                        </td>
                        <td align="right" style="padding:0 0 18px;color:#171412;font-size:22px;font-weight:600;">
                          ${escapeHtml(context.total)}
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #edf1f7;border-bottom:1px solid #edf1f7;">
                      ${itemRows || `<tr><td style="padding:16px 0;color:#5d6470;font-size:14px;">${escapeHtml(context.itemsText)}</td></tr>`}
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;">
                      <tr>
                        <td style="padding:7px 0;color:#5d6470;font-size:14px;">Subtotal</td>
                        <td align="right" style="padding:7px 0;color:#171412;font-size:14px;">${escapeHtml(context.subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#5d6470;font-size:14px;">Delivery</td>
                        <td align="right" style="padding:7px 0;color:#171412;font-size:14px;">${escapeHtml(context.shippingFee)}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0;color:#171412;font-size:18px;font-weight:700;">Total</td>
                        <td align="right" style="padding:14px 0 0;color:#171412;font-size:20px;font-weight:700;">${escapeHtml(context.total)}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="padding:0 34px 34px;">
                    <div style="background:#f5f8fc;padding:20px;border:1px solid rgba(108,147,196,0.16);">
                      <div style="margin-bottom:10px;color:#7f9dd0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
                        ${isInternal ? "Customer and delivery" : "Delivery details"}
                      </div>
                      <div style="color:#171412;font-size:14px;line-height:1.8;">
                        <strong>${escapeHtml(context.customerName)}</strong><br />
                        ${escapeHtml(context.addressLine)}<br />
                        ${escapeHtml(context.shippingAreaName)}<br />
                        ${escapeHtml(context.customerPhone)}${context.customerEmail ? `<br />${escapeHtml(context.customerEmail)}` : ""}
                      </div>
                    </div>
                  </div>

                  <div style="padding:22px 34px;background:#11100f;color:#ffffff;">
                    <div style="color:#ffffff;font-size:16px;font-weight:700;">Heaven Beauty</div>
                    <div style="margin-top:6px;color:#c8d6ee;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;">Beauty Store</div>
                    <div style="margin-top:14px;color:#d7d7d7;font-size:12px;line-height:1.7;">
                      ${isInternal ? "This alert was generated automatically from the admin notification settings." : "We will contact you if we need any extra details before delivery."}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 8px 0;color:#7f8aa0;font-size:11px;line-height:1.6;text-align:center;">
                  ${bodyHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function createItemRowsHtml(itemsText: string) {
  return itemsText
    .split("\n\n")
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const [name, quantityLine, totalLine] = lines;
      return `
        <tr>
          <td style="padding:16px 0;border-top:1px solid #edf1f7;">
            <div style="color:#171412;font-size:15px;font-weight:600;">${escapeHtml(name ?? "Product")}</div>
            <div style="margin-top:5px;color:#6c93c4;font-size:13px;">${escapeHtml(quantityLine ?? "")}</div>
          </td>
          <td align="right" style="padding:16px 0;border-top:1px solid #edf1f7;color:#171412;font-size:15px;font-weight:600;">
            ${escapeHtml(totalLine ?? "")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function textToHtml(text: string) {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<div style="white-space:pre-line;">${escaped}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlToPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function logNotification(
  supabase: LooseSupabase,
  payload: {
    channel: string;
    message: string;
    orderId: string;
    recipient?: string | null;
    status: string;
  },
) {
  await supabase.from("order_notification_logs").insert({
    channel: payload.channel,
    message: payload.message,
    order_id: payload.orderId,
    recipient: payload.recipient,
    status: payload.status,
  });
}
