import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-block size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin",
        className,
      )}
      role="status"
    />
  );
}
