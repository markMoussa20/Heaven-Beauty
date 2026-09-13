"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionState } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { removePromoBannerImage, uploadPromoBannerImage } from "@/lib/admin/promo-banner-images";
import { normalizeWallClock } from "@/lib/promo-banners/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { asBoolean, asNumber } from "@/lib/utils";

const BANNERS_PATH = "/admin/banners";

type MutationResult = { error: { code?: string; message: string } | null };
type LooseWriteClient = {
  from: (table: string) => {
    insert: (payload: unknown) => PromiseLike<MutationResult> & {
      select: (columns: string) => { single: () => PromiseLike<MutationResult & { data: unknown }> };
    };
    update: (payload: unknown) => { eq: (column: string, value: unknown) => PromiseLike<MutationResult> };
  };
};

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Colors must be 6-digit hex values like #6c93c4.");
const optionalText = (max: number) => z.string().trim().max(max).nullable();
const wallClock = z
  .string()
  .nullable()
  .refine((value) => value === null || normalizeWallClock(value) !== null, "Enter a valid date and time.");

const promoBannerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter an internal name.").max(100),
    message: z.string().trim().min(1, "Enter the banner message.").max(200, "Keep the message under 200 characters."),
    cta_label: optionalText(40),
    cta_href: optionalText(500).refine(
      (value) => value === null || /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/i.test(value),
      "The button link must be a site path like /shop or a full https:// URL.",
    ),
    background_color: hexColor,
    text_color: hexColor,
    button_background_color: hexColor,
    button_text_color: hexColor,
    starts_at: wallClock,
    ends_at: wallClock,
    all_countries: z.boolean(),
    country_ids: z.array(z.string().uuid()),
    is_enabled: z.boolean(),
    is_dismissible: z.boolean(),
    priority: z.number().int("Priority must be a whole number.").min(-1000).max(1000),
  })
  .superRefine((value, context) => {
    if (Boolean(value.cta_label) !== Boolean(value.cta_href)) {
      context.addIssue({
        code: "custom",
        path: value.cta_label ? ["cta_href"] : ["cta_label"],
        message: "Fill in both the button label and the button link, or leave both empty.",
      });
    }

    const start = normalizeWallClock(value.starts_at);
    const end = normalizeWallClock(value.ends_at);
    if (start && end && end <= start) {
      context.addIssue({ code: "custom", path: ["ends_at"], message: "The end time must be after the start time." });
    }

    if (!value.all_countries && value.country_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["country_ids"], message: "Select at least one country, or choose all countries." });
    }
  });

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || String(value).trim() === "" ? null : String(value).trim();
}

function failed(message = "The banner could not be saved. Please try again."): AdminActionState {
  return { ok: false, message };
}

export async function savePromoBanner(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  if (id && !z.string().uuid().safeParse(id).success) return failed("The banner identifier is invalid.");

  const parsed = promoBannerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    message: String(formData.get("message") ?? ""),
    cta_label: text(formData, "cta_label"),
    cta_href: text(formData, "cta_href"),
    background_color: String(formData.get("background_color") ?? ""),
    text_color: String(formData.get("text_color") ?? ""),
    button_background_color: String(formData.get("button_background_color") ?? ""),
    button_text_color: String(formData.get("button_text_color") ?? ""),
    starts_at: text(formData, "starts_at"),
    ends_at: text(formData, "ends_at"),
    all_countries: asBoolean(formData.get("all_countries")),
    country_ids: formData.getAll("country_ids").map(String).filter(Boolean),
    is_enabled: asBoolean(formData.get("is_enabled")),
    is_dismissible: asBoolean(formData.get("is_dismissible")),
    priority: asNumber(formData.get("priority")) ?? 0,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the banner fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { country_ids: countryIds, ...fields } = parsed.data;
  const payload: Record<string, unknown> = {
    ...fields,
    starts_at: normalizeWallClock(fields.starts_at),
    ends_at: normalizeWallClock(fields.ends_at),
  };

  // The hand-written Database type doesn't satisfy supabase-js' mutation generics
  // (inserts resolve to `never`), so writes go through a loosely typed client like actions.ts.
  const supabase = createAdminClient();
  const writes = supabase as unknown as LooseWriteClient;
  let previousImagePath: string | null = null;

  if (id) {
    const { data: existing, error } = await supabase
      .from("promo_banners")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("Failed to load promo banner", { code: error.code, message: error.message });
      return failed();
    }
    if (!existing) return failed("That banner no longer exists.");
    previousImagePath = (existing as { image_path: string | null }).image_path;
  }

  const image = formData.get("banner_image");
  let uploadedPath: string | null = null;

  if (image instanceof File && image.size > 0) {
    try {
      const uploaded = await uploadPromoBannerImage(image);
      payload.image_url = uploaded.url;
      payload.image_path = uploaded.path;
      uploadedPath = uploaded.path;
    } catch (error) {
      console.error("Failed to upload promo banner image", error);
      return failed("The image could not be uploaded. Use AVIF, JPEG, PNG, or WebP up to 5 MB.");
    }
  } else if (asBoolean(formData.get("remove_image"))) {
    payload.image_url = null;
    payload.image_path = null;
  }

  let bannerId = id;
  if (id) {
    const { error } = await writes.from("promo_banners").update(payload).eq("id", id);
    if (error) {
      console.error("Failed to update promo banner", { code: error.code, message: error.message });
      await removePromoBannerImage(uploadedPath);
      return failed();
    }
  } else {
    const { data, error } = await writes.from("promo_banners").insert(payload).select("id").single();
    if (error || !data) {
      console.error("Failed to insert promo banner", { code: error?.code, message: error?.message });
      await removePromoBannerImage(uploadedPath);
      return failed();
    }
    bannerId = (data as { id: string }).id;
  }

  const { error: clearLinksError } = await supabase
    .from("promo_banner_countries")
    .delete()
    .eq("banner_id", bannerId!);
  const { error: insertLinksError } =
    !fields.all_countries && countryIds.length > 0
      ? await writes
          .from("promo_banner_countries")
          .insert(countryIds.map((countryId) => ({ banner_id: bannerId!, country_id: countryId })))
      : { error: null };

  if (clearLinksError || insertLinksError) {
    const error = clearLinksError ?? insertLinksError;
    console.error("Failed to save promo banner countries", { code: error?.code, message: error?.message });
    return failed("The banner was saved, but its countries could not be updated. Please save it again.");
  }

  if (previousImagePath && "image_path" in payload && payload.image_path !== previousImagePath) {
    await removePromoBannerImage(previousImagePath);
  }

  revalidatePath("/", "layout");
  revalidatePath(BANNERS_PATH);
  redirect(BANNERS_PATH);
}

export async function deletePromoBanner(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promo_banners")
    .delete()
    .eq("id", id)
    .select("image_path")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete promo banner", { code: error.code, message: error.message });
    return;
  }

  await removePromoBannerImage((data as { image_path: string | null } | null)?.image_path);
  revalidatePath("/", "layout");
  revalidatePath(BANNERS_PATH);
}
