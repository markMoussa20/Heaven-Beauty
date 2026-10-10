/**
 * Pure cart price math. Amounts are summed in cents so totals match the
 * numeric(12,2) values place_order_v2 saves.
 */
export type PricedLine = {
  countryItemId: string;
  unitPrice: number;
  /** Price before discounts; missing on carts saved before discounts existed. */
  originalUnitPrice?: number;
  quantity: number;
};

export type CartPrice = {
  unitPrice: number;
  originalUnitPrice: number;
};

const toCents = (value: number) => Math.round(value * 100);

export function lineOriginalUnitPrice(line: PricedLine) {
  return line.originalUnitPrice !== undefined && line.originalUnitPrice > line.unitPrice
    ? line.originalUnitPrice
    : line.unitPrice;
}

export function summarizeCart(lines: PricedLine[]) {
  let subtotalCents = 0;
  let originalCents = 0;

  for (const line of lines) {
    subtotalCents += toCents(line.unitPrice) * line.quantity;
    originalCents += toCents(lineOriginalUnitPrice(line)) * line.quantity;
  }

  return {
    subtotal: subtotalCents / 100,
    originalSubtotal: originalCents / 100,
    discountTotal: (originalCents - subtotalCents) / 100,
  };
}

/** A server price is only applied when both amounts are finite and non-negative. */
const isUsableCartPrice = (price: CartPrice) =>
  Number.isFinite(price.unitPrice) &&
  price.unitPrice >= 0 &&
  Number.isFinite(price.originalUnitPrice) &&
  price.originalUnitPrice >= 0;

/**
 * Brings stored cart lines up to the server's current prices. `changed` is true
 * only when what the customer pays for a line changed.
 */
export function repriceCartItems<T extends PricedLine>(
  items: T[],
  prices: Record<string, CartPrice>,
): { items: T[]; changed: boolean } {
  let changed = false;
  let touched = false;

  const next = items.map((item) => {
    const current = prices[item.countryItemId];
    if (!current || !isUsableCartPrice(current)) return item;

    const paidChanged = toCents(current.unitPrice) !== toCents(item.unitPrice);
    const originalChanged =
      item.originalUnitPrice === undefined ||
      toCents(current.originalUnitPrice) !== toCents(item.originalUnitPrice);
    if (!paidChanged && !originalChanged) return item;

    changed ||= paidChanged;
    touched = true;
    return { ...item, unitPrice: current.unitPrice, originalUnitPrice: current.originalUnitPrice };
  });

  return { items: touched ? next : items, changed };
}

/** Lines read back from localStorage. A free (0) line is valid: 100% discounts exist. */
export function isValidStoredCartLine(item: unknown) {
  if (!item || typeof item !== "object") return false;
  const line = item as Record<string, unknown>;
  const unitPrice = Number(line.unitPrice);

  return (
    Boolean(line.countryItemId) &&
    Boolean(line.productId) &&
    Number(line.quantity) > 0 &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0
  );
}
