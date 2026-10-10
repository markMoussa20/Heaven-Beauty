import { describe, expect, it } from "vitest";

import {
  discountSchema,
  formatDiscountValue,
  getDiscountStatus,
  orderCategoriesForPicker,
  readDiscountForm,
} from "@/lib/discounts/rules";

const COUNTRY = "11111111-1111-4111-8111-111111111111";
const CATEGORY = "22222222-2222-4222-8222-222222222222";
const ITEM = "33333333-3333-4333-8333-333333333333";

const valid = {
  name: "Summer sale",
  country_id: COUNTRY,
  scope: "country",
  value_type: "percent",
  value: 10,
  starts_at: null,
  ends_at: null,
  is_enabled: true,
  category_ids: [],
  country_item_ids: [],
};

const firstMessage = (input: unknown) => {
  const result = discountSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("discountSchema", () => {
  it("accepts a country-wide percent discount", () => {
    expect(discountSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects percent above 100 and non-positive values", () => {
    expect(firstMessage({ ...valid, value: 101 })).toBe("A percent discount can't be more than 100.");
    expect(firstMessage({ ...valid, value: 0 })).toBe("The discount must be more than 0.");
  });

  it("allows fixed amounts above 100", () => {
    expect(discountSchema.safeParse({ ...valid, value_type: "amount", value: 250 }).success).toBe(true);
  });

  it("rejects more than 2 decimals", () => {
    expect(firstMessage({ ...valid, value: 12.345 })).toBe("Use at most 2 decimal places.");
  });

  it("rejects a missing value", () => {
    expect(discountSchema.safeParse({ ...valid, value: Number.NaN }).success).toBe(false);
  });

  it("requires categories or items for those scopes", () => {
    expect(firstMessage({ ...valid, scope: "category" })).toBe("Choose at least one category.");
    expect(firstMessage({ ...valid, scope: "items" })).toBe("Choose at least one item.");
    expect(discountSchema.safeParse({ ...valid, scope: "category", category_ids: [CATEGORY] }).success).toBe(true);
    expect(discountSchema.safeParse({ ...valid, scope: "items", country_item_ids: [ITEM] }).success).toBe(true);
  });

  it("requires the end after the start", () => {
    expect(
      firstMessage({ ...valid, starts_at: "2026-11-01T10:00", ends_at: "2026-11-01T10:00" }),
    ).toBe("The end time must be after the start time.");
  });
});

describe("readDiscountForm", () => {
  it("reads only the target list that matches the scope", () => {
    const formData = new FormData();
    formData.set("name", " Eid ");
    formData.set("country_id", COUNTRY);
    formData.set("scope", "items");
    formData.set("value_type", "amount");
    formData.set("value", "5");
    formData.set("starts_at", "");
    formData.set("is_enabled", "on");
    formData.append("category_ids", CATEGORY);
    formData.append("country_item_ids", ITEM);

    expect(readDiscountForm(formData)).toEqual({
      name: " Eid ",
      country_id: COUNTRY,
      scope: "items",
      value_type: "amount",
      value: 5,
      starts_at: null,
      ends_at: null,
      is_enabled: true,
      category_ids: [],
      country_item_ids: [ITEM],
    });
  });
});

describe("getDiscountStatus", () => {
  const beirut = { id: COUNTRY, code: "LB", timezone: "Asia/Beirut" };
  // 2026-10-10 09:00 UTC = 12:00 in Beirut.
  const now = new Date("2026-10-10T09:00:00Z");

  it("is disabled when switched off", () => {
    expect(getDiscountStatus({ is_enabled: false, starts_at: null, ends_at: null }, beirut, now)).toBe("disabled");
  });

  it("evaluates the window in the country's timezone", () => {
    const window = { is_enabled: true, starts_at: "2026-10-10T11:30:00", ends_at: "2026-10-10T13:00:00" };
    expect(getDiscountStatus(window, beirut, now)).toBe("live");
    expect(getDiscountStatus(window, { ...beirut, timezone: "UTC" }, now)).toBe("scheduled");
  });

  it("matches timezone names case-insensitively, like the pricing function", () => {
    const window = { is_enabled: true, starts_at: "2026-10-10T11:30:00", ends_at: "2026-10-10T13:00:00" };
    expect(getDiscountStatus(window, { ...beirut, timezone: "asia/beirut" }, now)).toBe("live");
  });

  it("evaluates an invalid timezone in UTC, not the country-code default", () => {
    const window = { is_enabled: true, starts_at: "2026-10-10T11:30:00", ends_at: "2026-10-10T13:00:00" };
    // LB would default to Beirut (live) for promo banners; pricing falls back to UTC.
    expect(getDiscountStatus(window, { ...beirut, timezone: "Not/AZone" }, now)).toBe("scheduled");
    expect(getDiscountStatus(window, { ...beirut, timezone: null }, now)).toBe("scheduled");
  });

  it("is expired after the end", () => {
    expect(
      getDiscountStatus({ is_enabled: true, starts_at: null, ends_at: "2026-10-10T11:00:00" }, beirut, now),
    ).toBe("expired");
  });
});

describe("formatDiscountValue", () => {
  it("formats percent and amount values", () => {
    expect(formatDiscountValue("percent", "10.00", "$")).toBe("10%");
    expect(formatDiscountValue("amount", 5.5, "$")).toBe("$5.5");
  });
});

describe("orderCategoriesForPicker", () => {
  it("lists children under their parent with depth", () => {
    const categories = [
      { id: "lips", parent_id: "makeup" },
      { id: "makeup", parent_id: null },
      { id: "skincare", parent_id: null },
    ];
    expect(orderCategoriesForPicker(categories).map(({ category, depth }) => [category.id, depth])).toEqual([
      ["makeup", 0],
      ["lips", 1],
      ["skincare", 0],
    ]);
  });

  it("still lists categories caught in a parent cycle", () => {
    const categories = [
      { id: "a", parent_id: "b" },
      { id: "b", parent_id: "a" },
    ];
    expect(orderCategoriesForPicker(categories)).toHaveLength(2);
  });
});
