"use client";

import { useId, useState } from "react";

import type { PublicPageFaqItem } from "@/types/database";

export function AnimatedQaAccordion({ item }: { item: PublicPageFaqItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const answerId = useId();

  return (
    <div className="overflow-hidden">
      <button
        aria-controls={answerId}
        aria-expanded={isOpen}
        className="w-full py-5 text-left text-base font-light leading-tight text-[#6c93c4] outline-none transition duration-300 hover:text-black focus-visible:text-black"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {item.question}
      </button>
      <div
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-500 ease-in-out data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100"
        data-open={isOpen}
        id={answerId}
      >
        <div className="overflow-hidden">
          <p className="max-w-[760px] pb-7 text-base font-light leading-[1.6] text-[#6c93c4]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
