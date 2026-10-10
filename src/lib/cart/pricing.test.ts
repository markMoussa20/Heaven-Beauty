import { describe, expect, it } from "vitest";

import {
  isValidStoredCartLine,
  lineOriginalUnitPrice,
  repriceCartItems,
  summarizeCart,
} from "@/lib/cart/pricing";

const line = (overrides: Partial<{ countryItemId: string; unitPrice: number; originalUnitPrice?: number; quantity: number }> = {}) => ({
  countryItemId: "a",
  unitPrice: 90,
  originalUnitPrice: 100,
  quantity: 1,
  ...overrides,
});

describe("lineOriginalUnitPrice", () => {
  it("falls back to the paid price when no original is stored", () => {
    expect(lineOriginalUnitPrice(line({ originalUnitPrice: undefined }))).toBe(90);
  });

  it("never reports an original below the paid price", () => {
    expect(lineOriginalUnitPrice(line({ originalUnitPrice: 50 }))).toBe(90);
  });
});

describe("summarizeCart", () => {
  it("adds subtotal, original subtotal and discount in cents", () => {
    expect(
      summarizeCart([
        line({ quantity: 2 }),
        line({ countryItemId: "b", unitPrice: 0.1, originalUnitPrice: 0.2, quantity: 3 }),
      ]),
    ).toEqual({ subtotal: 180.3, originalSubtotal: 200.6, discountTotal: 20.3 });
  });

  it("reports no discount for full-price carts", () => {
    expect(summarizeCart([line({ unitPrice: 40, originalUnitPrice: undefined })])).toEqual({
      subtotal: 40,
      originalSubtotal: 40,
      discountTotal: 0,
    });
  });
});

describe("repriceCartItems", () => {
  it("updates a line whose discount ended and reports the change", () => {
    const items = [line()];
    const result = repriceCartItems(items, { a: { unitPrice: 100, originalUnitPrice: 100 } });
    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({ unitPrice: 100, originalUnitPrice: 100 });
  });

  it("applies a discount that started after the item was added", () => {
    const result = repriceCartItems([line({ unitPrice: 100, originalUnitPrice: undefined })], {
      a: { unitPrice: 80, originalUnitPrice: 100 },
    });
    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({ unitPrice: 80, originalUnitPrice: 100 });
  });

  it("fills in a missing original silently when the paid price is unchanged", () => {
    const result = repriceCartItems([line({ unitPrice: 90, originalUnitPrice: undefined })], {
      a: { unitPrice: 90, originalUnitPrice: 100 },
    });
    expect(result.changed).toBe(false);
    expect(result.items[0].originalUnitPrice).toBe(100);
  });

  it("returns the same array when nothing differs", () => {
    const items = [line()];
    const result = repriceCartItems(items, { a: { unitPrice: 90, originalUnitPrice: 100 } });
    expect(result).toEqual({ items, changed: false });
    expect(result.items).toBe(items);
  });

  it("leaves lines without a current price untouched", () => {
    const items = [line()];
    expect(repriceCartItems(items, {}).items).toBe(items);
  });

  it("ignores unusable server prices", () => {
    const items = [line()];
    for (const price of [
      { unitPrice: Number.NaN, originalUnitPrice: 100 },
      { unitPrice: -1, originalUnitPrice: 100 },
    ]) {
      const result = repriceCartItems(items, { a: price });
      expect(result.items).toBe(items);
      expect(result.changed).toBe(false);
    }
  });

  it("re-prices a line to 0 when a 100% discount starts", () => {
    const result = repriceCartItems([line({ unitPrice: 20, originalUnitPrice: undefined })], {
      a: { unitPrice: 0, originalUnitPrice: 20 },
    });
    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({ unitPrice: 0, originalUnitPrice: 20 });
  });
});

describe("isValidStoredCartLine", () => {
  const stored = { countryItemId: "a", productId: "p", quantity: 1, unitPrice: 10 };

  it("accepts a normal line", () => {
    expect(isValidStoredCartLine(stored)).toBe(true);
  });

  it("accepts a free line (100% discount)", () => {
    expect(isValidStoredCartLine({ ...stored, unitPrice: 0 })).toBe(true);
  });

  it("rejects broken lines", () => {
    expect(isValidStoredCartLine(null)).toBe(false);
    expect(isValidStoredCartLine({ ...stored, unitPrice: -1 })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, unitPrice: "abc" })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, quantity: 0 })).toBe(false);
    expect(isValidStoredCartLine({ ...stored, countryItemId: "" })).toBe(false);
  });
});
