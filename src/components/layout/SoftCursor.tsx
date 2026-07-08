"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const TEXT_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [role="textbox"]';

export function SoftCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    const cursor = cursorRef.current;
    const root = document.documentElement;
    const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (!cursor || isAdmin || !supportsFinePointer) {
      root.classList.remove(
        "hb-custom-cursor",
        "hb-cursor-visible",
        "hb-cursor-moving",
        "hb-cursor-down",
        "hb-cursor-text",
      );
      return;
    }

    const moveCursor = (event: MouseEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      root.classList.add("hb-cursor-visible", "hb-cursor-moving");

      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }

      settleTimerRef.current = window.setTimeout(() => {
        root.classList.remove("hb-cursor-moving");
      }, 140);

      const target = event.target;
      if (target instanceof Element && target.closest(TEXT_TARGET_SELECTOR)) {
        root.classList.add("hb-cursor-text");
      } else {
        root.classList.remove("hb-cursor-text");
      }
    };

    const showCursor = () => root.classList.add("hb-cursor-visible");
    const hideCursor = () =>
      root.classList.remove("hb-cursor-visible", "hb-cursor-moving", "hb-cursor-down");
    const pressCursor = () => root.classList.add("hb-cursor-down");
    const releaseCursor = () => root.classList.remove("hb-cursor-down");

    root.classList.add("hb-custom-cursor");
    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseenter", showCursor);
    window.addEventListener("mouseleave", hideCursor);
    window.addEventListener("mousedown", pressCursor);
    window.addEventListener("mouseup", releaseCursor);

    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }

      root.classList.remove(
        "hb-custom-cursor",
        "hb-cursor-visible",
        "hb-cursor-moving",
        "hb-cursor-down",
        "hb-cursor-text",
      );
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseenter", showCursor);
      window.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("mousedown", pressCursor);
      window.removeEventListener("mouseup", releaseCursor);
    };
  }, [isAdmin]);

  if (isAdmin) {
    return null;
  }

  return (
    <div aria-hidden="true" className="hb-cursor" ref={cursorRef}>
      <span />
    </div>
  );
}
