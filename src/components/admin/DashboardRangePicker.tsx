import Link from "next/link";

import {
  DASHBOARD_RANGE_PRESETS,
  type ResolvedRange,
} from "@/lib/admin/dashboard-analytics";

/**
 * Preset shortcuts plus an explicit from/to window. The presets are plain
 * links so the range lives in the URL and stays shareable and bookmarkable;
 * the custom window is a GET form that writes the same query string.
 */
export function DashboardRangePicker({ range }: { range: ResolvedRange }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {DASHBOARD_RANGE_PRESETS.map((preset) => {
          const isActive = range.key === preset.key;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
              href={`/admin/dashboard?range=${preset.key}`}
              key={preset.key}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      <form
        action="/admin/dashboard"
        className="flex flex-wrap items-end gap-2"
        method="get"
      >
        <label className="grid gap-1 text-xs font-medium text-zinc-500">
          From
          <input
            className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
            defaultValue={range.fromDate}
            max={range.toDate}
            name="from"
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-zinc-500">
          To
          <input
            className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
            defaultValue={range.toDate}
            min={range.fromDate}
            name="to"
            type="date"
          />
        </label>
        <button
          className="h-9 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
          type="submit"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
