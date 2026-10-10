import { describe, expect, it } from "vitest";

import { parseFreeDeliveryThreshold, quoteDelivery } from "./delivery";

describe("parseFreeDeliveryThreshold", () => {
  it("treats empty values as no threshold", () => {
    expect(parseFreeDeliveryThreshold(null)).toBeNull();
    expect(parseFreeDeliveryThreshold(undefined)).toBeNull();
    expect(parseFreeDeliveryThreshold("")).toBeNull();
  });

  it("accepts numeric strings from Postgres numeric columns", () => {
    expect(parseFreeDeliveryThreshold("25.00")).toBe(25);
    expect(parseFreeDeliveryThreshold(0)).toBe(0);
  });

  it("ignores invalid or negative values", () => {
    expect(parseFreeDeliveryThreshold("abc")).toBeNull();
    expect(parseFreeDeliveryThreshold(-5)).toBeNull();
  });
});

describe("quoteDelivery", () => {
  it("shows the base fee when no threshold is configured", () => {
    expect(quoteDelivery({ baseFee: 3, subtotal: 100, freeDeliveryThreshold: null })).toEqual({
      fee: 3,
      display: "fee",
      amountToFree: null,
    });
  });

  it("charges the fee and reports the gap below the threshold", () => {
    expect(quoteDelivery({ baseFee: 3, subtotal: 18.5, freeDeliveryThreshold: 25 })).toEqual({
      fee: 3,
      display: "fee",
      amountToFree: 6.5,
    });
  });

  it("shows Free exactly at the threshold", () => {
    expect(quoteDelivery({ baseFee: 3, subtotal: 25, freeDeliveryThreshold: "25.00" })).toEqual({
      fee: 0,
      display: "free",
      amountToFree: null,
    });
  });

  it("shows Free above the threshold even when the base fee is zero", () => {
    expect(quoteDelivery({ baseFee: 0, subtotal: 30, freeDeliveryThreshold: 25 }).display).toBe("free");
  });

  it("hides a zero fee below the threshold but keeps the nudge", () => {
    expect(quoteDelivery({ baseFee: 0, subtotal: 19, freeDeliveryThreshold: 25 })).toEqual({
      fee: 0,
      display: "hidden",
      amountToFree: 6,
    });
  });

  it("hides a zero fee when no threshold is configured", () => {
    expect(quoteDelivery({ baseFee: 0, subtotal: 19, freeDeliveryThreshold: null })).toEqual({
      fee: 0,
      display: "hidden",
      amountToFree: null,
    });
  });

  it("is not fooled by floating point subtotals", () => {
    // 0.1 + 0.2 + 24.7 is 25.000000000000004 or 24.999999999999996 depending on order.
    const subtotal = 24.7 + 0.2 + 0.1;
    expect(quoteDelivery({ baseFee: 3, subtotal, freeDeliveryThreshold: 25 }).display).toBe("free");
  });

  it("rounds the remaining amount to cents", () => {
    expect(
      quoteDelivery({ baseFee: 3, subtotal: 24.9 - 0.8, freeDeliveryThreshold: 25 }).amountToFree,
    ).toBe(0.9);
  });

  it("makes every order free with a zero threshold", () => {
    expect(quoteDelivery({ baseFee: 3, subtotal: 1, freeDeliveryThreshold: 0 })).toMatchObject({
      fee: 0,
      display: "free",
    });
  });
});
