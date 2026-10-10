import { describe, expect, it } from "vitest";

import {
  formatDiscountBadge,
  getDisplayPrice,
  getItemPricing,
  resolveItemPrice,
  toItemPricing,
} from "@/lib/pricing";
import type { ItemPricing } from "@/types/database";

const discounted: ItemPricing = {
  originalPrice: 100,
  finalPrice: 90,
  discountType: "percent",
  discountValue: 10,
  discountAmount: 10,
};

describe("getDisplayPrice", () => {
  it("uses the regular price when no pricing is attached", () => {
    expect(getDisplayPrice({ price: "25.50" })).toBe(25.5);
  });

  it("uses the discounted final price when pricing is attached", () => {
    expect(getDisplayPrice({ price: 100, pricing: discounted })).toBe(90);
  });

  it("keeps a free (0) final price instead of falling back", () => {
    expect(getDisplayPrice({ price: 4, pricing: { ...discounted, originalPrice: 4, finalPrice: 0 } })).toBe(0);
  });
});

describe("resolveItemPrice", () => {
  it("returns 0 for missing or invalid prices", () => {
    expect(resolveItemPrice(null)).toBe(0);
    expect(resolveItemPrice({ price: "abc" })).toBe(0);
  });
});

describe("toItemPricing", () => {
  it("parses numeric strings from PostgREST", () => {
    expect(
      toItemPricing({
        country_item_id: "x",
        original_price: "30.00",
        final_price: "25.00",
        discount_id: "d",
        discount_type: "amount",
        discount_value: "5.00",
        discount_amount: "5.00",
      }),
    ).toEqual({ originalPrice: 30, finalPrice: 25, discountType: "amount", discountValue: 5, discountAmount: 5 });
  });

  it("returns no discount fields for undiscounted rows", () => {
    expect(
      toItemPricing({
        country_item_id: "x",
        original_price: 12,
        final_price: 12,
        discount_id: null,
        discount_type: null,
        discount_value: null,
        discount_amount: 0,
      }),
    ).toEqual({ originalPrice: 12, finalPrice: 12, discountType: null, discountValue: null, discountAmount: 0 });
  });
});

describe("formatDiscountBadge", () => {
  it("formats percent and amount discounts", () => {
    expect(formatDiscountBadge("percent", 10, "$")).toBe("-10%");
    expect(formatDiscountBadge("percent", 12.5, "$")).toBe("-12.5%");
    expect(formatDiscountBadge("amount", 5, "$")).toBe("-$5");
    expect(formatDiscountBadge("amount", 1500, "E£")).toBe("-E£1,500");
  });

  it("returns null without a usable discount", () => {
    expect(formatDiscountBadge(null, 10, "$")).toBeNull();
    expect(formatDiscountBadge("percent", null, "$")).toBeNull();
    expect(formatDiscountBadge("percent", 0, "$")).toBeNull();
  });
});

describe("getItemPricing", () => {
  it("reports a discounted item with its badge", () => {
    expect(getItemPricing({ price: 100, pricing: discounted }, "$")).toEqual({
      original: 100,
      final: 90,
      isDiscounted: true,
      badge: "-10%",
    });
  });

  it("shows an amount rule's capped saving, not the rule value", () => {
    const capped: ItemPricing = {
      originalPrice: 4,
      finalPrice: 0,
      discountType: "amount",
      discountValue: 10,
      discountAmount: 4,
    };
    expect(getItemPricing({ price: 4, pricing: capped }, "$").badge).toBe("-$4");
    expect(
      getItemPricing({ price: 30, pricing: { ...capped, originalPrice: 30, finalPrice: 20, discountAmount: 10 } }, "$")
        .badge,
    ).toBe("-$10");
  });

  it("reports an undiscounted item without a badge", () => {
    expect(getItemPricing({ price: 40 }, "$")).toEqual({
      original: 40,
      final: 40,
      isDiscounted: false,
      badge: null,
    });
  });
});
