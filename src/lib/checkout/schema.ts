import { regexes, z } from "zod";

/** Largest quantity of one product a single order may hold; place_order_v2 enforces the same. */
export const MAX_LINE_QUANTITY = 10;

/** The fields the shopper types, keyed by schema name, with their form input names. */
export const CUSTOMER_FIELDS = {
  phone: "phone",
  email: "email",
  firstName: "first_name",
  lastName: "last_name",
  address: "address",
  apartment: "apartment",
  city: "city",
  shippingZoneId: "shipping_zone_id",
  postalCode: "postal_code",
  notes: "notes",
} as const;

export type CustomerField = keyof typeof CUSTOMER_FIELDS;
export type CheckoutFieldErrors = Partial<Record<string, string[]>>;

const cartLineSchema = z.object({
  countryItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const checkoutSchema = z.object({
  countryId: z.string().uuid(),
  shippingZoneId: z.string().uuid("Choose your governorate.").nullable(),
  idempotencyKey: z.string().uuid(),
  phone: z
    .string()
    .trim()
    .min(5, "Enter a mobile phone number with at least 5 digits.")
    .max(30, "Enter a mobile phone number of 30 characters or fewer."),
  // Optional, but when given it must be a full address such as name@example.com.
  // The browser's own email check accepts "name@gmail", so it is not enough.
  email: z
    .string()
    .trim()
    .max(254, "Enter an email address of 254 characters or fewer.")
    .refine(
      (value) => value === "" || regexes.email.test(value),
      "Enter a full email address, like name@example.com, or leave it empty.",
    ),
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "Use 80 characters or fewer."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80, "Use 80 characters or fewer."),
  address: z
    .string()
    .trim()
    .min(3, "Enter your delivery address (at least 3 characters).")
    .max(250, "Use 250 characters or fewer."),
  apartment: z.string().trim().max(100, "Use 100 characters or fewer."),
  city: z.string().trim().min(1, "Enter your city.").max(100, "Use 100 characters or fewer."),
  postalCode: z.string().trim().max(30, "Use 30 characters or fewer."),
  notes: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  items: z.array(cartLineSchema).min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Reads the checkout form into the shape checkoutSchema expects. */
export function readCheckoutForm(formData: FormData) {
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("cart_items") ?? "[]"));
  } catch {
    items = null;
  }

  return {
    countryId: formData.get("country_id"),
    shippingZoneId: String(formData.get("shipping_zone_id") ?? "") || null,
    idempotencyKey: formData.get("idempotency_key"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    firstName: formData.get("first_name"),
    lastName: formData.get("last_name"),
    address: formData.get("address"),
    apartment: formData.get("apartment") ?? "",
    city: formData.get("city"),
    postalCode: formData.get("postal_code") ?? "",
    notes: formData.get("notes") ?? "",
    items,
  };
}

export type CheckoutValidation =
  | { ok: true; data: CheckoutInput }
  | {
      ok: false;
      fieldErrors: CheckoutFieldErrors;
      /** Paths and issue codes only, never values, so they are safe to log. */
      issues: { path: string; code: string }[];
    };

export function validateCheckout(formData: FormData): CheckoutValidation {
  const parsed = checkoutSchema.safeParse(readCheckoutForm(formData));
  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    fieldErrors: z.flattenError(parsed.error).fieldErrors,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "(root)",
      code: issue.code,
    })),
  };
}

/**
 * The banner text for a failed check. Errors on fields the shopper can fix are
 * shown beside those fields; anything else (cart, country, session) cannot be
 * fixed by retyping, so the banner says what to do instead.
 */
export function checkoutValidationMessage(fieldErrors: CheckoutFieldErrors) {
  const failed = Object.keys(fieldErrors).filter((key) => fieldErrors[key]?.length);
  if (failed.includes("items")) {
    return `Your cart could not be checked out. Each product can be ordered up to ${MAX_LINE_QUANTITY} times; please review your cart or refresh the page and try again.`;
  }
  if (failed.some((key) => !(key in CUSTOMER_FIELDS))) {
    return "Your checkout session is out of date. Please refresh the page and try again.";
  }
  return "Please fix the highlighted fields and try again.";
}
