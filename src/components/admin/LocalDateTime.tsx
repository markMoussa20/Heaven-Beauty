"use client";

import { useEffect, useState } from "react";

type LocalDateTimeProps = {
  value?: string | null;
};

export function LocalDateTime({ value }: LocalDateTimeProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsMounted(true), 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!isMounted || !value) {
    return <span suppressHydrationWarning>-</span>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span suppressHydrationWarning>-</span>;
  }

  return (
    <span suppressHydrationWarning>
      {new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)}
    </span>
  );
}
