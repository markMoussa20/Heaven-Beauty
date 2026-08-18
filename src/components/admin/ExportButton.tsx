import { Download } from "lucide-react";

/**
 * Links to an export route carrying the current list filters, so the
 * spreadsheet always matches what the admin is looking at on screen.
 */
export function ExportButton({
  filters,
  href,
  label = "Export to Excel",
}: {
  filters: Record<string, string | undefined>;
  href: string;
  label?: string;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  const search = query.toString();

  return (
    <a
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
      href={search ? `${href}?${search}` : href}
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}
