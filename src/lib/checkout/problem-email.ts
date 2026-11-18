import { MAX_LINE_QUANTITY } from "@/lib/checkout/schema";

/**
 * One reason a checkout attempt failed. `field` is a checkout schema field
 * (phone, email, items, ...) or "order" when the database refused the order,
 * in which case `code` is the place_order_v2 error code.
 */
export type CheckoutProblem = { field: string; code: string };

export type CheckoutProblemReport = {
  problems: CheckoutProblem[];
  /** The banner text the shopper saw. */
  customerMessage: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    apartment: string;
    city: string;
    governorate: string;
    postalCode: string;
    notes: string;
  };
  countryName: string;
  cart: { name: string; quantity: number }[];
  occurredAt: Date;
  /** IANA zone for the shopper's country, so the time reads as local. */
  timeZone: string;
};

type Explained = { label: string; typed?: string; explanation: string };

/** What staff should do next, from the most serious problem. */
type NextStep = "contact" | "refresh" | "stock" | "developer";

const FIELD_LABELS: Record<string, string> = {
  phone: "Mobile phone number",
  email: "Email address",
  firstName: "First name",
  lastName: "Last name",
  address: "Address",
  apartment: "Apartment, suite, etc.",
  city: "City",
  shippingZoneId: "Governorate",
  postalCode: "Postal code",
  notes: "Order notes",
};

const ORDER_PROBLEMS: Record<string, { label: string; explanation: string; step: NextStep }> = {
  INSUFFICIENT_STOCK: {
    label: "Stock",
    explanation: "A product in the cart does not have enough stock for the quantity requested.",
    step: "stock",
  },
  ITEM_UNAVAILABLE: {
    label: "Product unavailable",
    explanation: "A product in the cart is no longer available on the website.",
    step: "stock",
  },
  PRICE_CHANGED: {
    label: "Price changed",
    explanation:
      "A price changed while the customer was checking out. The website showed the new price and asked them to place the order again.",
    step: "contact",
  },
  RATE_LIMITED: {
    label: "Too many attempts",
    explanation:
      "The customer tried many times in a short period, so the website asked them to wait a minute before trying again.",
    step: "contact",
  },
  INVALID_SHIPPING_ZONE: {
    label: "Delivery area",
    explanation: "The governorate chosen is not available for delivery in this country.",
    step: "developer",
  },
  COUNTRY_UNAVAILABLE: {
    label: "Country",
    explanation: "Orders for this country are currently switched off on the website.",
    step: "developer",
  },
};

const STEP_PRIORITY: NextStep[] = ["developer", "stock", "refresh", "contact"];

const NEXT_STEP_TEXT: Record<NextStep, string> = {
  contact:
    "The website showed the customer what to fix, so they may still complete the order themselves. If no order from them arrives in the next 15 minutes, contact them on the phone number listed under Customer to help them finish it.",
  refresh:
    "The customer's checkout page was out of date. Ask them to refresh the page (or close and reopen the website) and place the order again.",
  stock:
    "Check stock for the products above. Contact the customer to offer an alternative or to let them know when it is back.",
  developer:
    "This looks like a problem with the website's setup rather than something the customer did. Please forward this email to whoever maintains the website, and contact the customer to take the order another way.",
};

export function buildCheckoutProblemEmail(report: CheckoutProblemReport) {
  const explained = explainProblems(report);
  const step = nextStep(report.problems);
  const name = fullName(report);
  const phone = report.customer.phone.trim();
  const who = name || "A customer";
  const subject = `[Heaven Beauty] Order not completed: ${who}${phone ? ` (${phone})` : ""}`;
  const when = formatTime(report.occurredAt, report.timeZone, report.countryName);
  const customerRows = customerDetails(report);
  const cartRows = report.cart.map((line) => `${line.quantity} x ${line.name}`);

  const text = [
    `${who} tried to place an order on the website, but it did not go through.`,
    "",
    "WHAT WENT WRONG",
    ...explained.flatMap((item) => [
      `- ${item.label}${item.typed !== undefined ? `: "${item.typed}"` : ""}`,
      `  ${item.explanation}`,
    ]),
    "",
    "The customer saw this message on the website:",
    `"${report.customerMessage}"`,
    "",
    "CUSTOMER",
    ...customerRows.map(([label, value]) => `${label}: ${value}`),
    "",
    "CART",
    ...(cartRows.length ? cartRows : ["(empty)"]),
    "",
    "WHAT TO DO",
    NEXT_STEP_TEXT[step],
    "",
    `Time: ${when}`,
  ].join("\n");

  const html = renderHtml({ cartRows, customerRows, explained, report, step, when, who });
  return { subject, text, html };
}

function explainProblems(report: CheckoutProblemReport): Explained[] {
  const seen = new Set<string>();
  const explained: Explained[] = [];

  for (const problem of report.problems) {
    const key = `${problem.field}:${problem.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    explained.push(explainProblem(problem, report));
  }
  return explained;
}

function explainProblem(problem: CheckoutProblem, report: CheckoutProblemReport): Explained {
  if (problem.field === "order") {
    const known = ORDER_PROBLEMS[problem.code];
    return known
      ? { label: known.label, explanation: known.explanation }
      : {
          label: "Website error",
          explanation: "The website could not save the order because of a technical problem.",
        };
  }

  if (problem.field === "items") {
    const tooMany = report.cart.filter((line) => line.quantity > MAX_LINE_QUANTITY);
    if (problem.code === "too_big" && tooMany.length) {
      return {
        label: "Cart",
        explanation: `The cart has more than ${MAX_LINE_QUANTITY} of one product (${tooMany
          .map((line) => `${line.quantity} x ${line.name}`)
          .join(", ")}). The website allows at most ${MAX_LINE_QUANTITY} of each product per order.`,
      };
    }
    return {
      label: "Cart",
      explanation: "The cart could not be read. Refreshing the page usually fixes this.",
    };
  }

  if (problem.field in FIELD_LABELS) {
    return {
      label: FIELD_LABELS[problem.field],
      typed: typedValue(problem.field, report),
      explanation: fieldExplanation(problem),
    };
  }

  // countryId, idempotencyKey: hidden fields the customer never sees.
  return {
    label: "Checkout page",
    explanation: "The checkout page the customer had open was out of date.",
  };
}

function fieldExplanation({ field, code }: CheckoutProblem) {
  if (field === "email" && code === "custom") {
    return "This is not a complete email address. It should look like name@example.com. (Email is optional; the customer can also leave it empty.)";
  }
  if (field === "shippingZoneId") return "No governorate was selected.";
  if (code === "too_small") {
    if (field === "phone") return "The phone number is too short. It needs at least 5 digits.";
    if (field === "address") return "The address is too short. It needs at least 3 characters.";
    return "This was left empty, but it is required.";
  }
  if (code === "too_big") return "This is longer than the website allows.";
  return "This was not filled in correctly.";
}

function typedValue(field: string, report: CheckoutProblemReport) {
  const customer = report.customer;
  const values: Record<string, string> = {
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    apartment: customer.apartment,
    city: customer.city,
    postalCode: customer.postalCode,
    notes: customer.notes,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
  if (!(field in values)) return undefined;
  const value = values[field].trim();
  return value === "" ? undefined : value;
}

function nextStep(problems: CheckoutProblem[]): NextStep {
  const steps = new Set<NextStep>(
    problems.map((problem) => {
      if (problem.field === "order") return ORDER_PROBLEMS[problem.code]?.step ?? "developer";
      if (problem.field in FIELD_LABELS) return "contact";
      if (problem.field === "items") return "contact";
      return "refresh";
    }),
  );
  return STEP_PRIORITY.find((step) => steps.has(step)) ?? "contact";
}

function customerDetails(report: CheckoutProblemReport): [string, string][] {
  const c = report.customer;
  const address = [c.address, c.apartment].map((part) => part.trim()).filter(Boolean).join(", ");
  // Always shown, so staff can see what is missing.
  const main: [string, string][] = [
    ["Name", fullName(report)],
    ["Phone", c.phone],
    ["Email", c.email],
    ["Address", address],
    ["City", c.city],
  ];
  // Shown only when filled in; governorates exist in some countries only.
  const optional: [string, string][] = [
    ["Governorate", c.governorate],
    ["Postal code", c.postalCode],
    ["Order notes", c.notes],
  ];
  return [
    ...main.map(([label, value]): [string, string] => [label, value.trim() || "(not given)"]),
    ...optional.filter(([, value]) => value.trim()),
    ["Country", report.countryName],
  ];
}

function formatTime(date: Date, timeZone: string, countryName: string) {
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
    return timeZone === "UTC" ? `${formatted} (UTC)` : `${formatted} (${countryName} time)`;
  } catch {
    return date.toISOString();
  }
}

function renderHtml({
  cartRows,
  customerRows,
  explained,
  report,
  step,
  when,
  who,
}: {
  cartRows: string[];
  customerRows: [string, string][];
  explained: Explained[];
  report: CheckoutProblemReport;
  step: NextStep;
  when: string;
  who: string;
}) {
  const heading = "font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7f9dd0;margin:0 0 10px;";
  const problemsHtml = explained
    .map(
      (item) => `
        <div style="padding:14px 16px;margin:0 0 10px;background:#fdf2f2;border-left:4px solid #d64545;">
          <div style="font-size:15px;font-weight:700;color:#171412;">${escapeHtml(item.label)}</div>
          ${
            item.typed !== undefined
              ? `<div style="margin-top:4px;font-size:14px;color:#171412;">Customer typed: <strong>${escapeHtml(item.typed)}</strong></div>`
              : ""
          }
          <div style="margin-top:6px;font-size:14px;line-height:1.6;color:#5d6470;">${escapeHtml(item.explanation)}</div>
        </div>`,
    )
    .join("");
  const customerHtml = customerRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:5px 12px 5px 0;color:#5d6470;font-size:14px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:5px 0;color:#171412;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  const cartHtml = (cartRows.length ? cartRows : ["(empty)"])
    .map((row) => `<div style="padding:4px 0;font-size:14px;color:#171412;">${escapeHtml(row)}</div>`)
    .join("");

  return `
    <div style="margin:0;padding:0;background:#e6ecf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(explained.map((item) => item.label).join(", "))}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#e6ecf4;">
        <tr><td style="padding:30px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid rgba(108,147,196,0.18);">
            <tr><td style="padding:30px 30px 20px;border-bottom:1px solid #edf1f7;">
              <div style="${heading}">Order not completed</div>
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;color:#171412;">${escapeHtml(who)} could not place an order</h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#5d6470;">They tried to check out on the website, but the order did not go through.</p>
            </td></tr>
            <tr><td style="padding:24px 30px 8px;">
              <div style="${heading}">What went wrong</div>
              ${problemsHtml}
              <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#5d6470;">The customer saw: &ldquo;${escapeHtml(report.customerMessage)}&rdquo;</p>
            </td></tr>
            <tr><td style="padding:20px 30px 8px;">
              <div style="padding:16px 18px;background:#eef4fb;border:1px solid rgba(108,147,196,0.25);">
                <div style="${heading}">What to do</div>
                <div style="font-size:15px;line-height:1.6;color:#171412;">${escapeHtml(NEXT_STEP_TEXT[step])}</div>
              </div>
            </td></tr>
            <tr><td style="padding:20px 30px 8px;">
              <div style="${heading}">Customer</div>
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${customerHtml}</table>
            </td></tr>
            <tr><td style="padding:20px 30px 28px;">
              <div style="${heading}">Cart</div>
              ${cartHtml}
            </td></tr>
            <tr><td style="padding:16px 30px;background:#11100f;color:#d7d7d7;font-size:12px;line-height:1.6;">
              ${escapeHtml(when)} &middot; Sent automatically by the Heaven Beauty website when a checkout attempt fails.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fullName(report: CheckoutProblemReport) {
  return `${report.customer.firstName.trim()} ${report.customer.lastName.trim()}`.trim();
}
