"use client";

import { useFormStatus } from "react-dom";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2", className)}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? <LoadingSpinner className="size-3.5" label="Deleting" /> : null}
      {pending ? "Working..." : children}
    </button>
  );
}
