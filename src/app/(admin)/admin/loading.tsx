import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-zinc-600">
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <LoadingSpinner className="size-5" label="Loading admin page" />
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    </div>
  );
}
