import { cn } from "@/lib/utils";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "green" | "red" | "yellow" | "blue" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "yellow" && "bg-amber-50 text-amber-700",
        tone === "blue" && "bg-sky-50 text-sky-700",
        tone === "neutral" && "bg-zinc-100 text-zinc-700",
      )}
    >
      {children}
    </span>
  );
}
