import { describe, expect, it } from "vitest";

import { buildWakilniPackages } from "./package";

const order = { id: "0f1e-uuid", order_number: "HB-1042" };

describe("buildWakilniPackages", () => {
  it("sends a multi-item cart as a single package", () => {
    const packages = buildWakilniPackages(
      order,
      [
        { product_name: "Rose Lipstick", quantity: 2 },
        { product_name: "Vitamin C Serum", quantity: 1 },
        { product_name: "Night Cream", quantity: 3 },
      ],
      58,
    );

    expect(packages).toEqual([
      {
        quantity: 1,
        type_id: 58,
        name: "Order HB-1042: 2x Rose Lipstick, 1x Vitamin C Serum, 3x Night Cream",
        sku: "HB-1042",
      },
    ]);
  });

  it("uses the configured package type and falls back to the order id", () => {
    const [pkg] = buildWakilniPackages(
      { id: "0f1e-uuid", order_number: null as unknown as string },
      [{ product_name: "", quantity: 1 }],
      61,
    );

    expect(pkg).toEqual({
      quantity: 1,
      type_id: 61,
      name: "Order 0f1e-uuid: 1x Beauty product",
      sku: "0f1e-uuid",
    });
  });

  it("caps very long contents lists", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      product_name: `Long product name number ${i}`,
      quantity: 1,
    }));
    const [pkg] = buildWakilniPackages(order, items, 58);

    expect(pkg.name.length).toBeLessThanOrEqual(190);
    expect(pkg.name.startsWith("Order HB-1042: 1x Long product name number 0")).toBe(true);
    expect(pkg.name.endsWith("…")).toBe(true);
  });
});
