"use client";

import { useActionState } from "react";
import type { ComponentProps, ReactNode } from "react";

import type { AdminActionState } from "@/lib/admin/actions";

type Props = Omit<ComponentProps<"form">, "action"> & {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  children: ReactNode;
};

export function AdminActionForm({ action, children, ...props }: Props) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} {...props}>
      {state && !state.ok ? (
        <div className="col-span-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p className="font-semibold">Could not save changes</p>
          <p className="mt-1">{state.message}</p>
        </div>
      ) : null}
      {children}
    </form>
  );
}
