"use client";

import { useFormStatus } from "react-dom";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  className,
  disabled,
  pendingLabel = "Saving...",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      className={cn("inline-flex items-center justify-center gap-2", className)}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <LoadingSpinner className="size-3.5" label={pendingLabel} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
