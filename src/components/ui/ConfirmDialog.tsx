"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel?: string;
  description?: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  children,
  confirmLabel = "Confirm",
  description,
  disabled = false,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center bg-[#171412]/40 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md bg-white p-6 text-[#171412] shadow-2xl">
        <h2 className="text-2xl font-medium">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-[#6c93c4]">{description}</p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="border border-[#6c93c4]/25 px-5 py-3 text-sm font-medium text-[#6c93c4] transition hover:border-[#6c93c4]"
            disabled={disabled}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="bg-[#6c93c4] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#547cae] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
