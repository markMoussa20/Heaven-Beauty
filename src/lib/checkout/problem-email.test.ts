import { describe, expect, it } from "vitest";

import {
  buildCheckoutProblemEmail,
  type CheckoutProblemReport,
} from "@/lib/checkout/problem-email";

function report(overrides: Partial<CheckoutProblemReport> = {}): CheckoutProblemReport {
  return {
    problems: [{ field: "email", code: "custom" }],
    customerMessage: "Please fix the highlighted fields and try again.",
    customer: {
      firstName: "Sara",
      lastName: "Haddad",
      phone: "71 123 456",
      email: "sara@gmail",
      address: "Hamra Street",
      apartment: "Building 4",
      city: "Beirut",
      governorate: "",
      postalCode: "",
      notes: "",
    },
    countryName: "Lebanon",
    cart: [{ name: "Heavenly Tint - Kind", quantity: 1 }],
    occurredAt: new Date("2026-11-18T11:45:00Z"),
    timeZone: "Asia/Beirut",
    ...overrides,
  };
}

describe("buildCheckoutProblemEmail", () => {
  it("names the customer and phone in the subject", () => {
    expect(buildCheckoutProblemEmail(report()).subject).toBe(
      "[Heaven Beauty] Order not completed: Sara Haddad (71 123 456)",
    );
  });

  it("explains a bad email in plain words with what was typed", () => {
    const { text } = buildCheckoutProblemEmail(report());
    expect(text).toContain('- Email address: "sara@gmail"');
    expect(text).toContain("should look like name@example.com");
    expect(text).toContain("Address: Hamra Street, Building 4");
    expect(text).toContain("1 x Heavenly Tint - Kind");
    expect(text).toContain("contact them on the phone number listed under Customer");
  });

  it("shows the time in the customer's country", () => {
    expect(buildCheckoutProblemEmail(report()).text).toContain("18 Nov 2026, 13:45 (Lebanon time)");
  });

  it("says a field was left empty instead of quoting nothing", () => {
    const { text } = buildCheckoutProblemEmail(
      report({
        problems: [{ field: "city", code: "too_small" }],
        customer: { ...report().customer, city: "" },
      }),
    );
    expect(text).toContain("- City\n  This was left empty, but it is required.");
    expect(text).toContain("City: (not given)");
  });

  it("uses a neutral name when none was typed", () => {
    const { subject, text } = buildCheckoutProblemEmail(
      report({ customer: { ...report().customer, firstName: "", lastName: "", phone: "" } }),
    );
    expect(subject).toBe("[Heaven Beauty] Order not completed: A customer");
    expect(text.startsWith("A customer tried to place an order")).toBe(true);
  });

  it("explains an over-limit cart with the product and quantity", () => {
    const { text } = buildCheckoutProblemEmail(
      report({
        problems: [{ field: "items", code: "too_big" }],
        cart: [{ name: "Heavenly Tint - Pure", quantity: 12 }],
      }),
    );
    expect(text).toContain("more than 10 of one product (12 x Heavenly Tint - Pure)");
  });

  it("tells staff to check stock when the database reports low stock", () => {
    const { text } = buildCheckoutProblemEmail(
      report({ problems: [{ field: "order", code: "INSUFFICIENT_STOCK" }] }),
    );
    expect(text).toContain("does not have enough stock");
    expect(text).toContain("Check stock for the products above.");
  });

  it("asks for a refresh when a hidden page field is stale", () => {
    const { text } = buildCheckoutProblemEmail(
      report({ problems: [{ field: "idempotencyKey", code: "invalid_format" }] }),
    );
    expect(text).toContain("Ask them to refresh the page");
  });

  it("routes unknown website errors to whoever maintains the site", () => {
    const { text } = buildCheckoutProblemEmail(
      report({ problems: [{ field: "order", code: "UNKNOWN" }] }),
    );
    expect(text).toContain("forward this email to whoever maintains the website");
  });

  it("escapes what the customer typed in the HTML version", () => {
    const { html } = buildCheckoutProblemEmail(
      report({ customer: { ...report().customer, email: '<script>alert("x")</script>' } }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
