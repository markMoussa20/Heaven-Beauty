import { z } from "zod";

import {
  isWithinSchedule,
  normalizeWallClock,
  resolveCountryTimeZone,
  wallClockIn,
  type ScheduleCountry,
} from "@/lib/promo-banners/schedule";
import { asBoolean, asNumber } from "@/lib/utils";
import type { DiscountValueType } from "@/types/database";

export const DISCOUNT_SCOPES = ["country", "category", "items"] as const;
export const DISCOUNT_VALUE_TYPES = ["percent", "amount"] as const;

const wallClock = z
  .string()
  .nullable()
  .refine((value) => value === null || normalizeWallClock(value) !== null, "Enter a valid date and time.");

// Mirrors the CHECK constraints on public.discounts.
export const discountSchema = z
  .object({
    name: z.string().trim().min(1, "Enter an internal name.").max(120, "Keep the name under 120 characters."),
    country_id: z.string().uuid("Choose a country."),
    scope: z.enum(DISCOUNT_SCOPES),
    value_type: z.enum(DISCOUNT_VALUE_TYPES),
    value: z
      .number({ error: "Enter the discount value." })
      .gt(0, "The discount must be more than 0.")
      .max(9_999_999_999.99, "That discount is too large."),
    starts_at: wallClock,
    ends_at: wallClock,
    is_enabled: z.boolean(),
    category_ids: z.array(z.string().uuid()),
    country_item_ids: z.array(z.string().uuid()),
  })
  .superRefine((value, context) => {
    if (value.value_type === "percent" && value.value > 100) {
      context.addIssue({ code: "custom", path: ["value"], message: "A percent discount can't be more than 100." });
    }

    if (Math.abs(value.value * 100 - Math.round(value.value * 100)) > 1e-6) {
      context.addIssue({ code: "custom", path: ["value"], message: "Use at most 2 decimal places." });
    }

    if (value.scope === "category" && value.category_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["category_ids"], message: "Choose at least one category." });
    }

    if (value.scope === "items" && value.country_item_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["country_item_ids"], message: "Choose at least one item." });
    }

    const start = normalizeWallClock(value.starts_at);
    const end = normalizeWallClock(value.ends_at);
    if (start && end && end <= start) {
      context.addIssue({ code: "custom", path: ["ends_at"], message: "The end time must be after the start time." });
    }
  });

export type DiscountInput = z.infer<typeof discountSchema>;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || String(value).trim() === "" ? null : String(value);
}

/** Raw values for discountSchema; only the target list matching the scope is kept. */
export function readDiscountForm(formData: FormData) {
  const scope = String(formData.get("scope") ?? "");
  const ids = (key: string) => [...new Set(formData.getAll(key).map(String).filter(Boolean))];

  return {
    name: String(formData.get("name") ?? ""),
    country_id: String(formData.get("country_id") ?? ""),
    scope,
    value_type: String(formData.get("value_type") ?? ""),
    value: asNumber(formData.get("value")),
    starts_at: text(formData, "starts_at"),
    ends_at: text(formData, "ends_at"),
    is_enabled: asBoolean(formData.get("is_enabled")),
    category_ids: scope === "category" ? ids("category_ids") : [],
    country_item_ids: scope === "items" ? ids("country_item_ids") : [],
  };
}

export type DiscountStatus = "disabled" | "live" | "scheduled" | "expired";

export function getDiscountStatus(
  discount: { is_enabled: boolean; starts_at: string | null; ends_at: string | null },
  country: ScheduleCountry,
  now: Date,
): DiscountStatus {
  if (!discount.is_enabled) return "disabled";

  const timeZone = resolveCountryTimeZone(country);
  if (isWithinSchedule(discount, now, timeZone)) return "live";

  const start = normalizeWallClock(discount.starts_at);
  return start !== null && wallClockIn(now, timeZone) < start ? "scheduled" : "expired";
}

export function formatDiscountValue(type: DiscountValueType, value: number | string, currencySymbol: string) {
  const amount = Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return type === "percent" ? `${amount}%` : `${currencySymbol}${amount}`;
}

/** Parents first, each followed by its children (depth-first), for an indented checklist. */
export function orderCategoriesForPicker<T extends { id: string; parent_id?: string | null }>(categories: T[]) {
  const ids = new Set(categories.map((category) => category.id));
  const children = new Map<string | null, T[]>();
  for (const category of categories) {
    const parent = category.parent_id && ids.has(category.parent_id) ? category.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), category]);
  }

  const ordered: Array<{ category: T; depth: number }> = [];
  const seen = new Set<string>();
  const visit = (parent: string | null, depth: number) => {
    for (const category of children.get(parent) ?? []) {
      if (seen.has(category.id)) continue;
      seen.add(category.id);
      ordered.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);

  // Categories stuck in a parent cycle are never reached from a root; list them flat.
  for (const category of categories) {
    if (!seen.has(category.id)) ordered.push({ category, depth: 0 });
  }

  return ordered;
}
