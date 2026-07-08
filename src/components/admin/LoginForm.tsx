"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { loginAdmin } from "@/lib/admin/actions";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, null);
  const {
    register,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
  });

  return (
    <form action={action} className="grid gap-4">
      <ErrorMessage message={state?.error} />
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Email
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950"
          type="email"
          {...register("email")}
        />
        {errors.email ? (
          <span className="text-xs text-red-600">{errors.email.message}</span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        Password
        <input
          className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950"
          type="password"
          {...register("password")}
        />
        {errors.password ? (
          <span className="text-xs text-red-600">{errors.password.message}</span>
        ) : null}
      </label>
      <button
        className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
