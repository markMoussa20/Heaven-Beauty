"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch">;

/**
 * Drop-in `next/link` replacement for the storefront that prefetches only once
 * the visitor shows intent (hover, touch or keyboard focus), not as soon as the
 * link scrolls into view.
 *
 * Every storefront page renders on demand, so each prefetch is a full server
 * render billed as Vercel function CPU. With viewport prefetching, one shop
 * visit fired ~22 renders (footer, header and product links) for pages the
 * visitor mostly never opened.
 */
export default function IntentPrefetchLink({
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: IntentPrefetchLinkProps) {
  const [hasIntent, setHasIntent] = useState(false);

  return (
    <NextLink
      {...props}
      onFocus={(event) => {
        setHasIntent(true);
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        setHasIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setHasIntent(true);
        onTouchStart?.(event);
      }}
      prefetch={hasIntent ? null : false}
    />
  );
}
