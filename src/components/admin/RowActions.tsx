"use client";

import Link from "next/link";

export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="font-medium text-zinc-950 underline-offset-4 hover:underline" href={href}>
      {children}
    </Link>
  );
}
