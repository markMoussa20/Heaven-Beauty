import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center bg-[#e6ecf4] text-[#6c93c4]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner className="size-8" label="Loading page" />
        <p className="text-xs font-medium uppercase tracking-[0.28em]">
          Heaven Beauty
        </p>
      </div>
    </div>
  );
}
