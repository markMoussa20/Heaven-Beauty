import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { orderStatusLabel } from "@/lib/orders/statuses";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function attachmentHeaders(
  prefix: string,
  generatedAt: Date,
  byteLength: number,
) {
  const stamp = generatedAt.toISOString().slice(0, 10);
  const filename = `heaven-beauty-${prefix}-${stamp}.xlsx`;
  return {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(byteLength),
    // Exports are a point-in-time snapshot; never let one be reused.
    "Cache-Control": "no-store",
  };
}

/**
 * Renders the active filters as a sentence for the sheet subtitle, so a
 * downloaded file always states which slice of data it represents.
 */
export async function describeFilters(filters: {
  q?: string;
  country_id?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const parts: string[] = [];

  if (filters.country_id) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("countries")
      .select("name")
      .eq("id", filters.country_id)
      .maybeSingle();
    const name = (data as { name?: string } | null)?.name;
    parts.push(`Country: ${name ?? filters.country_id}`);
  }
  if (filters.status) parts.push(`Status: ${orderStatusLabel(filters.status)}`);
  if (filters.from || filters.to) {
    parts.push(`Dates: ${filters.from ?? "start"} to ${filters.to ?? "today"}`);
  }
  if (filters.q) parts.push(`Search: "${filters.q}"`);

  return parts.length ? parts.join(" · ") : "All records";
}
