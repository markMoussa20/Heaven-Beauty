import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin/auth";
import { getCustomersForExport } from "@/lib/admin/export-data";
import { buildCustomersWorkbook } from "@/lib/admin/export-workbook";
import { describeFilters, XLSX_CONTENT_TYPE, attachmentHeaders } from "@/lib/admin/export-response";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters = {
    q: searchParams.get("q") ?? undefined,
    country_id: searchParams.get("country_id") ?? undefined,
  };

  try {
    const [{ rows, truncated }, filterSummary] = await Promise.all([
      getCustomersForExport(filters),
      describeFilters(filters),
    ]);

    const generatedAt = new Date();
    const workbook = await buildCustomersWorkbook({
      rows,
      filterSummary: truncated
        ? `${filterSummary} (truncated at 10,000 customers)`
        : filterSummary,
      generatedAt,
    });

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        ...attachmentHeaders("customers", generatedAt, workbook.byteLength),
      },
    });
  } catch (error) {
    console.error("Customers export failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}
