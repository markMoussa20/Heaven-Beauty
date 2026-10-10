"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AdminActionState } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { discountSchema, readDiscountForm } from "@/lib/discounts/rules";
import { normalizeWallClock } from "@/lib/promo-banners/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Discount } from "@/types/database";

const DISCOUNTS_PATH = "/admin/discounts";

type MutationResult = { error: { code?: string; message: string } | null };
type LooseWriteClient = {
  from: (table: string) => {
    insert: (payload: unknown) => PromiseLike<MutationResult> & {
      select: (columns: string) => { single: () => PromiseLike<MutationResult & { data: unknown }> };
    };
    update: (payload: unknown) => { eq: (column: string, value: unknown) => PromiseLike<MutationResult> };
  };
};

function failed(message = "The discount could not be saved. Please try again."): AdminActionState {
  return { ok: false, message };
}

function revalidateDiscountViews() {
  // Prices show on every storefront page and on the admin country items list.
  revalidatePath("/", "layout");
  revalidatePath(DISCOUNTS_PATH);
  revalidatePath("/admin/country-items");
}

async function replaceLinks(
  discountId: string,
  categoryIds: string[],
  countryItemIds: string[],
): Promise<string | null> {
  // Hand-written Database types don't satisfy supabase-js' mutation generics,
  // so writes go through a loosely typed client like promo-banner-actions.ts.
  const supabase = createAdminClient();
  const writes = supabase as unknown as LooseWriteClient;

  const [clearCategories, clearItems] = await Promise.all([
    supabase.from("discount_categories").delete().eq("discount_id", discountId),
    supabase.from("discount_items").delete().eq("discount_id", discountId),
  ]);
  const clearError = clearCategories.error ?? clearItems.error;
  if (clearError) return clearError.message;

  if (categoryIds.length > 0) {
    const { error } = await writes
      .from("discount_categories")
      .insert(categoryIds.map((categoryId) => ({ discount_id: discountId, category_id: categoryId })));
    if (error) return error.message;
  }

  if (countryItemIds.length > 0) {
    const { error } = await writes
      .from("discount_items")
      .insert(countryItemIds.map((countryItemId) => ({ discount_id: discountId, country_item_id: countryItemId })));
    if (error) return error.message;
  }

  return null;
}

export async function saveDiscount(
  id: string | null,
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  if (id && !z.string().uuid().safeParse(id).success) return failed("The discount identifier is invalid.");

  const parsed = discountSchema.safeParse(readDiscountForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the discount fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { category_ids: categoryIds, country_item_ids: countryItemIds, ...fields } = parsed.data;
  const supabase = createAdminClient();
  const writes = supabase as unknown as LooseWriteClient;

  if (countryItemIds.length > 0) {
    // Chunked so a large selection doesn't overflow the request URL (ids are
    // already unique, so the counts must add up to the selection).
    let found = 0;
    for (let index = 0; index < countryItemIds.length; index += 200) {
      const slice = countryItemIds.slice(index, index + 200);
      const { count, error } = await supabase
        .from("country_items")
        .select("id", { count: "exact", head: true })
        .eq("country_id", fields.country_id)
        .in("id", slice);
      if (error) {
        console.error("Failed to check discount items", { code: error.code, message: error.message });
        return failed();
      }
      found += count ?? 0;
    }
    if (found !== countryItemIds.length) {
      return failed("Some selected items don't belong to that country. Re-select the items and save again.");
    }
  }

  const payload = {
    ...fields,
    starts_at: normalizeWallClock(fields.starts_at),
    ends_at: normalizeWallClock(fields.ends_at),
  };

  let discountId = id;
  if (id) {
    const { data: existing, error: lookupError } = await supabase
      .from("discounts")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) {
      console.error("Failed to load discount", { code: lookupError.code, message: lookupError.message });
      return failed();
    }
    if (!existing) return failed("That discount no longer exists.");

    const { error } = await writes.from("discounts").update(payload).eq("id", id);
    if (error) {
      console.error("Failed to update discount", { code: error.code, message: error.message });
      return failed();
    }
  } else {
    const { data, error } = await writes.from("discounts").insert(payload).select("id").single();
    if (error || !data) {
      console.error("Failed to insert discount", { code: error?.code, message: error?.message });
      return failed();
    }
    discountId = (data as { id: string }).id;
  }

  const linkError = await replaceLinks(discountId!, categoryIds, countryItemIds);
  if (linkError) {
    console.error("Failed to save discount targets", { message: linkError });
    if (!id) {
      // A half-created discount would be duplicated by a retry (the form still has no id), so undo it.
      const { error: undoError } = await supabase.from("discounts").delete().eq("id", discountId!);
      if (undoError) {
        console.error("Failed to remove half-created discount", { code: undoError.code, message: undoError.message });
      }
      return failed();
    }
    return failed("The discount was saved, but its categories or items could not be updated. Please save it again.");
  }

  revalidateDiscountViews();
  redirect(DISCOUNTS_PATH);
}

/** Copies a discount (switched off, so the copy never goes live by accident). */
export async function duplicateDiscount(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("discounts")
    .select("*, discount_categories(category_id), discount_items(country_item_id)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    console.error("Failed to load discount to duplicate", { code: error?.code, message: error?.message });
    return;
  }

  const source = data as unknown as Discount & {
    discount_categories: { category_id: string }[] | null;
    discount_items: { country_item_id: string }[] | null;
  };
  const writes = supabase as unknown as LooseWriteClient;
  const { data: inserted, error: insertError } = await writes
    .from("discounts")
    .insert({
      name: `Copy of ${source.name}`.slice(0, 120),
      country_id: source.country_id,
      scope: source.scope,
      value_type: source.value_type,
      value: source.value,
      starts_at: source.starts_at,
      ends_at: source.ends_at,
      is_enabled: false,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    console.error("Failed to duplicate discount", { code: insertError?.code, message: insertError?.message });
    return;
  }

  const linkError = await replaceLinks(
    (inserted as { id: string }).id,
    (source.discount_categories ?? []).map((link) => link.category_id),
    (source.discount_items ?? []).map((link) => link.country_item_id),
  );
  if (linkError) console.error("Failed to copy discount targets", { message: linkError });

  revalidateDiscountViews();
}

export async function deleteDiscount(id: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;

  const supabase = createAdminClient();
  // Link rows cascade; past order lines keep discount_name and amounts (discount_id becomes null).
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete discount", { code: error.code, message: error.message });
    return;
  }

  revalidateDiscountViews();
}
