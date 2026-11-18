import { describe, expect, it } from "vitest";

import {
  checkoutValidationMessage,
  validateCheckout,
} from "@/lib/checkout/schema";

const COUNTRY = "8f14e45f-ceea-4e6c-8d4b-7a1f2b3c4d5e";
const ITEM = "c9f0f895-fb98-4b91-9e1a-2d3c4b5a6f70";
const KEY = "45c48cce-2e2d-4fbd-a3c1-0f1e2d3c4b5a";

function checkoutForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields: Record<string, string> = {
    country_id: COUNTRY,
    cart_items: JSON.stringify([{ countryItemId: ITEM, quantity: 1 }]),
    idempotency_key: KEY,
    shipping_zone_id: "",
    phone: "71 123 456",
    email: "",
    first_name: "Sara",
    last_name: "Haddad",
    address: "Hamra Street, Building 4",
    apartment: "",
    city: "Beirut",
    postal_code: "",
    notes: "",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

function failedFields(formData: FormData) {
  const result = validateCheckout(formData);
  return result.ok ? [] : Object.keys(result.fieldErrors);
}

describe("validateCheckout", () => {
  it("accepts a complete order with no email", () => {
    expect(validateCheckout(checkoutForm()).ok).toBe(true);
  });

  it("accepts a full email, trimming spaces", () => {
    const result = validateCheckout(checkoutForm({ email: "  Sara@Gmail.com " }));
    expect(result.ok && result.data.email).toBe("Sara@Gmail.com");
  });

  it("treats a spaces-only email as empty", () => {
    expect(validateCheckout(checkoutForm({ email: "   " })).ok).toBe(true);
  });

  it.each(["sara@gmail", "sara.@gmail.com", "sara..x@gmail.com", "sara@gmail.com."])(
    "rejects the browser-accepted email %j with a message the shopper can act on",
    (email) => {
      const result = validateCheckout(checkoutForm({ email }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.email?.[0]).toMatch(/full email address/);
      }
    },
  );

  it("rejects a short address and phone on their own fields", () => {
    expect(failedFields(checkoutForm({ address: "ab", phone: "1234" })).sort()).toEqual([
      "address",
      "phone",
    ]);
  });

  it("rejects a quantity above 10", () => {
    const formData = checkoutForm({
      cart_items: JSON.stringify([{ countryItemId: ITEM, quantity: 11 }]),
    });
    expect(failedFields(formData)).toEqual(["items"]);
  });

  it("reports an unreadable cart as an items error instead of throwing", () => {
    expect(failedFields(checkoutForm({ cart_items: "{not json" }))).toEqual(["items"]);
  });

  it("logs issue paths and codes but never the typed values", () => {
    const result = validateCheckout(checkoutForm({ email: "secret-person@gmail", phone: "12" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          { path: "phone", code: "too_small" },
          { path: "email", code: "custom" },
        ]),
      );
      expect(JSON.stringify(result.issues)).not.toContain("secret-person");
    }
  });
});

describe("checkoutValidationMessage", () => {
  it("points at the highlighted fields when the shopper can fix them", () => {
    expect(checkoutValidationMessage({ email: ["x"] })).toMatch(/highlighted fields/);
  });

  it("explains cart problems, which no field highlight can show", () => {
    expect(checkoutValidationMessage({ items: ["x"] })).toMatch(/cart/);
  });

  it("asks for a refresh when a hidden session field fails", () => {
    expect(checkoutValidationMessage({ idempotencyKey: ["x"] })).toMatch(/refresh/);
  });
});

