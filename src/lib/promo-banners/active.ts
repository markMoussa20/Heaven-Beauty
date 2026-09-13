import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { pickActiveBanner, wallClockIn, type SchedulableBanner } from "@/lib/promo-banners/schedule";
import {
  PROMO_DISMISSED_COOKIE,
  getDismissKey,
  parseDismissedKeys,
  type StorefrontPromoBanner,
} from "@/lib/promo-banners/storefront";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Country, PromoBanner } from "@/types/database";

type PromoBannerWithCountries = PromoBanner & {
  promo_banner_countries: { country_id: string }[] | null;
};

/**
 * The one banner the announcement bar should show for `country` on this request,
 * or null when nothing is live or the visitor dismissed it.
 *
 * Banners have no public read policy (so scheduled promos don't leak), hence the
 * service-role client. Failures are logged and treated as "no banner" so a missing
 * migration or a database hiccup never breaks the storefront layout.
 */
export const getActivePromoBanner = cache(
  async (country: Country | null): Promise<StorefrontPromoBanner | null> => {
    if (!country) return null;

    try {
      // Every IANA offset is within ±14h, so anything that ended more than 36h ago
      // (UTC wall clock) is expired in every country and can be skipped in SQL.
      const expiredBefore = wallClockIn(new Date(Date.now() - 36 * 60 * 60 * 1000), "UTC");
      const { data, error } = await createAdminClient()
        .from("promo_banners")
        .select("*, promo_banner_countries(country_id)")
        .eq("is_enabled", true)
        .or(`ends_at.is.null,ends_at.gt.${expiredBefore}`);

      if (error) {
        console.error("Failed to fetch promo banners", { code: error.code, message: error.message });
        return null;
      }

      const rows = (data ?? []) as unknown as PromoBannerWithCountries[];
      const candidates = rows.map((row) => ({
        ...row,
        country_ids: (row.promo_banner_countries ?? []).map((link) => link.country_id),
      })) satisfies SchedulableBanner[];

      const banner = pickActiveBanner(candidates, country, new Date());
      if (!banner) return null;

      const dismissKey = getDismissKey(banner);
      // Treat a missing column (pre-migration) as closable, matching the column default.
      const isDismissible = banner.is_dismissible !== false;
      if (isDismissible) {
        const cookieStore = await cookies();
        const dismissed = parseDismissedKeys(cookieStore.get(PROMO_DISMISSED_COOKIE)?.value);
        if (dismissed.includes(dismissKey)) return null;
      }

      return {
        id: banner.id,
        dismissKey,
        message: banner.message,
        cta_label: banner.cta_label,
        cta_href: banner.cta_href,
        image_url: banner.image_url,
        background_color: banner.background_color,
        text_color: banner.text_color,
        button_background_color: banner.button_background_color,
        button_text_color: banner.button_text_color,
        is_dismissible: isDismissible,
      };
    } catch (error) {
      console.error("Failed to resolve promo banner", error);
      return null;
    }
  },
);
