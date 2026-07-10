import Link from "next/link";

import { AnimatedQaAccordion } from "@/components/pages/AnimatedQaAccordion";
import { shell } from "@/lib/design";
import type { PublicPage, PublicPageFaqItem } from "@/types/database";

export function PublicPageView({
  faqItems = [],
  page,
}: {
  faqItems?: PublicPageFaqItem[];
  page: PublicPage;
}) {
  const bodyBlocks = (page.body ?? "")
    .split(/(?:\r?\n){2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (page.slug === "privacy-policy") {
    return <LegalPageView page={page} bodyBlocks={bodyBlocks} />;
  }

  if (page.slug === "our-story") {
    return <OurStoryPageView page={page} bodyBlocks={bodyBlocks} />;
  }

  if (page.slug === "faq") {
    return <FaqPageView faqItems={faqItems} />;
  }

  if (page.slug === "return-cancellations") {
    return <PolicyPageView page={page} bodyBlocks={bodyBlocks} />;
  }

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <section className="relative min-h-[72vh] overflow-hidden pt-28">
        {page.image_url ? (
          <div
            aria-label={page.image_alt ?? page.title}
            className="absolute inset-0 bg-cover bg-center opacity-45 hb-page-drift"
            style={{ backgroundImage: `url('${page.image_url}')` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-[#e6ecf4]/70" />
        <div className={`${shell} relative flex min-h-[58vh] items-center py-20`}>
          <div className="max-w-4xl hb-fade-up">
            {page.subtitle ? (
              <p className="text-sm font-medium uppercase tracking-[0.28em]">
                {page.subtitle}
              </p>
            ) : null}
            <h1 className="mt-5 text-6xl font-medium leading-none sm:text-7xl lg:text-8xl">
              {page.title}
            </h1>
            {bodyBlocks[0] ? (
              <p className="mt-8 max-w-2xl text-xl font-light leading-9">
                {bodyBlocks[0]}
              </p>
            ) : null}
            {page.cta_label && page.cta_href ? (
              <Link
                className="mt-10 inline-flex bg-[#9eb9d9] px-7 py-4 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-[#6c93c4]"
                href={page.cta_href}
              >
                {page.cta_label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`${shell} py-16 lg:py-24`}>
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <h2 className="text-4xl font-medium leading-tight text-[#7f9dd0]">
            {page.subtitle ?? page.title}
          </h2>
          <div className="space-y-8 text-lg font-light leading-9">
            {(bodyBlocks.length > 1 ? bodyBlocks.slice(1) : bodyBlocks).map(
              (block) => (
                <p key={block}>{block}</p>
              ),
            )}
          </div>
        </div>
      </section>
      {faqItems.length > 0 ? (
        <AccordionSection faqItems={faqItems} />
      ) : null}
    </main>
  );
}

function PolicyPageView({
  page,
  bodyBlocks,
}: {
  page: PublicPage;
  bodyBlocks: string[];
}) {
  const sections = toPolicySections(bodyBlocks);
  const titleLines =
    page.slug === "return-cancellations"
      ? ["Return", "& Cancelation"]
      : splitPageTitle(page.title);

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <section className={`${shell} pb-20 pt-32 sm:pt-36 lg:pb-28 lg:pt-44`}>
        <div className="hb-fade-up max-w-[980px]">
          <h1 className="text-[2.7rem] font-normal leading-[1.1] text-[#6c93c4] sm:text-[4.4rem] lg:text-[5.4rem]">
            {titleLines[0]}
            {titleLines[1] ? (
              <span className="mt-2 block sm:mt-4">{titleLines[1]}</span>
            ) : null}
          </h1>
        </div>

        <div className="mt-12 max-w-[1120px] space-y-20 sm:mt-16 lg:mt-20 lg:space-y-24">
          {sections.map((section) => (
            <section className="max-w-[860px] hb-fade-up" key={section.heading}>
              <h2 className="text-xl font-normal leading-snug text-[#6c93c4] sm:text-2xl">
                {section.heading}
              </h2>
              <div className="mt-7 space-y-6 text-base font-light leading-[1.65] text-[#6c93c4] sm:text-lg">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{renderTextWithLinks(paragraph)}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

function FaqPageView({
  faqItems,
}: {
  faqItems: PublicPageFaqItem[];
}) {
  const groups = groupFaqItems(faqItems);

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <section className={`${shell} pb-20 pt-32 sm:pt-36 lg:pb-28 lg:pt-44`}>
        <div className="hb-fade-up max-w-[980px]">
          <h1 className="text-[2.7rem] font-normal leading-[1.1] text-[#6c93c4] sm:text-[4.4rem] lg:text-[5.4rem]">
            Frequently
            <span className="mt-2 block sm:mt-4">Asked Questions</span>
          </h1>
          <a
            className="mt-10 inline-flex text-base font-light leading-relaxed text-[#6c93c4] transition duration-300 hover:text-black"
            href="mailto:info@myheavenbeauty.com"
          >
            info@myheavenbeauty.com
          </a>
        </div>

        <QaCollection groups={groups} />
      </section>
    </main>
  );
}

function AccordionSection({ faqItems }: { faqItems: PublicPageFaqItem[] }) {
  const groups = groupFaqItems(faqItems);

  return <QaCollection groups={groups} compact />;
}

function QaCollection({
  compact = false,
  groups,
}: {
  compact?: boolean;
  groups: { title: string; items: PublicPageFaqItem[] }[];
}) {
  return (
    <div
      className={`${compact ? "mt-10" : "mt-14 sm:mt-16 lg:mt-20"} max-w-[980px] space-y-14 sm:space-y-16`}
    >
      {groups.map((group) => (
        <section className="hb-fade-up" key={group.title}>
          <h2 className="text-xl font-normal leading-snug text-[#6c93c4] sm:text-2xl">
            {group.title}
          </h2>
          <div className="mt-6 divide-y divide-[#6c93c4]/18 border-y border-[#6c93c4]/18">
            {group.items.map((item) => (
              <AnimatedQaAccordion item={item} key={item.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function OurStoryPageView({
  page,
  bodyBlocks,
}: {
  page: PublicPage;
  bodyBlocks: string[];
}) {
  const sections = toStorySections(bodyBlocks);
  const intro =
    sections[0]?.paragraphs[0] ??
    bodyBlocks[0] ??
    "Heaven Beauty creates effortless beauty essentials made to enhance your natural glow.";
  const differenceParagraphs = sections[1]?.paragraphs ?? bodyBlocks.slice(1);
  const beginningParagraphs = sections[2]?.paragraphs ?? [];

  return (
    <main className="overflow-hidden bg-[#e6ecf4] text-[#6c93c4]">
      <section className="relative min-h-[92vh] pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-white/35" />
        <div className={`${shell} relative grid min-h-[78vh] items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20`}>
          <div className="hb-fade-up max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#8aa7d0]">
              {page.subtitle ?? "The story"}
            </p>
            <h1 className="mt-6 text-[4.5rem] font-medium leading-[0.9] text-[#86a3d3] sm:text-[6.8rem] lg:text-[8.5rem]">
              Heaven
              <span className="block pl-[12vw] lg:pl-28">Beauty</span>
            </h1>
            <p className="mt-10 max-w-2xl text-xl font-light leading-9 text-[#6c93c4]">
              {intro}
            </p>
            {page.cta_label && page.cta_href ? (
              <Link
                className="mt-10 inline-flex bg-[#86a3d3] px-8 py-4 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-[#6c93c4]"
                href={page.cta_href}
              >
                {page.cta_label}
              </Link>
            ) : null}
          </div>

          {page.image_url ? (
            <div className="relative mx-auto w-full max-w-[560px] lg:mr-0">
              <div className="absolute -left-4 top-8 h-full w-full border border-[#9eb9d9]/45 sm:-left-7 sm:top-10" />
              <div className="relative overflow-hidden bg-white p-3 shadow-[0_28px_80px_rgba(108,147,196,0.18)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={page.image_alt ?? page.title}
                  className="h-[520px] w-full object-cover object-center sm:h-[680px] lg:h-[720px]"
                  src={page.image_url}
                />
              </div>
              <p className="absolute -bottom-7 right-3 bg-[#e6ecf4] px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#86a3d3]">
                Soft glow, made simple
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${shell} py-16 lg:py-24`}>
        <div className="grid items-start gap-12 border-y border-[#9eb9d9]/35 py-14 lg:grid-cols-[0.68fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9eb9d9]">
              Philosophy
            </p>
            <h2 className="mt-5 text-5xl font-medium leading-tight text-[#86a3d3] lg:text-6xl">
              {sections[1]?.heading ?? "The Heavenly Difference"}
            </h2>
          </div>
          <div className="space-y-7 text-lg font-light leading-9 text-[#6c93c4]">
            {differenceParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {page.secondary_image_url ? (
        <section className="pb-16 lg:pb-24">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.46fr] lg:px-8">
            <div className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={page.secondary_image_alt ?? "Heaven Beauty products"}
                className="h-[280px] w-full object-cover object-center sm:h-[430px] lg:h-[560px]"
                src={page.secondary_image_url}
              />
            </div>
            <div className="flex flex-col justify-end border-l border-[#9eb9d9]/40 pl-6 lg:pb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9eb9d9]">
                First essential
              </p>
              <h2 className="mt-5 text-4xl font-medium leading-tight text-[#86a3d3] lg:text-5xl">
                {sections[2]?.heading ?? "The Beginning"}
              </h2>
              {beginningParagraphs.map((paragraph) => (
                <p className="mt-6 text-lg font-light leading-9" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${shell} pb-28`}>
        <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {storyValues.map((value) => (
            <div
              className="border-t border-[#9eb9d9]/45 pt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#86a3d3]"
              key={value}
            >
              {value}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <h2 className="text-5xl font-medium text-[#86a3d3]">{page.title}</h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg font-light leading-9">
            Effortless beauty essentials made to enhance your natural glow.
          </p>
        </div>
      </section>
    </main>
  );
}

function LegalPageView({
  page,
  bodyBlocks,
}: {
  page: PublicPage;
  bodyBlocks: string[];
}) {
  const [firstTitleWord, ...titleRest] = page.title.split(" ");
  const sections = toLegalSections(bodyBlocks);

  return (
    <main className="bg-[#e6ecf4] text-[#7f9dd0]">
      <section className="mx-auto max-w-[1500px] px-6 pb-16 pt-44 sm:px-10 lg:pt-52">
        <h1 className="hb-fade-up text-[4.9rem] font-medium leading-[0.95] tracking-normal text-[#86a3d3] sm:text-[6.5rem] lg:text-[7.6rem]">
          <span>{firstTitleWord} ~</span>
          <span className="mt-8 block pl-[7vw]">{titleRest.join(" ")}</span>
        </h1>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-24 sm:px-10">
        <div className="space-y-8">
          {sections.length > 0
            ? sections.map((section) => (
                <section
                  className="border-b border-[#7f9dd0]/20 pb-8"
                  key={section.heading}
                >
                  <h2 className="text-4xl font-medium leading-tight text-[#7f9dd0] sm:text-5xl">
                    {section.heading}
                  </h2>
                  <div className="mt-6 space-y-6 text-lg font-light leading-8 text-[#7f9dd0]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{renderTextWithLinks(paragraph)}</p>
                    ))}
                  </div>
                </section>
              ))
            : bodyBlocks.map((block) => (
                <p className="text-lg font-light leading-8" key={block}>
                  {renderTextWithLinks(block)}
                </p>
              ))}
        </div>
      </section>
    </main>
  );
}

function toLegalSections(blocks: string[]) {
  const sections: { heading: string; paragraphs: string[] }[] = [];

  for (const block of blocks) {
    if (isLegalHeading(block)) {
      sections.push({ heading: block, paragraphs: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].paragraphs.push(block);
    }
  }

  return sections;
}

function toPolicySections(blocks: string[]) {
  const sections: { heading: string; paragraphs: string[] }[] = [];

  for (const block of blocks) {
    if (policyHeadings.has(block)) {
      sections.push({ heading: block, paragraphs: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].paragraphs.push(block);
    }
  }

  return sections.length > 0
    ? sections
    : blocks.map((block) => ({ heading: block, paragraphs: [] }));
}

function toStorySections(blocks: string[]) {
  const sections: { heading: string; paragraphs: string[] }[] = [
    { heading: "Intro", paragraphs: [] },
  ];

  for (const block of blocks) {
    if (isStoryHeading(block)) {
      sections.push({ heading: block, paragraphs: [] });
    } else {
      sections[sections.length - 1].paragraphs.push(block);
    }
  }

  return sections;
}

function groupFaqItems(items: PublicPageFaqItem[]) {
  const groups: { title: string; items: PublicPageFaqItem[] }[] = [];

  for (const item of items) {
    const title = item.group_title || "Questions";
    const group = groups.find((currentGroup) => currentGroup.title === title);

    if (group) {
      group.items.push(item);
    } else {
      groups.push({ title, items: [item] });
    }
  }

  return groups;
}

function isStoryHeading(value: string) {
  return storyHeadings.has(value);
}

function splitPageTitle(title: string) {
  const words = title.split(" ");

  if (words.length < 2) {
    return [title, ""];
  }

  const midpoint = Math.ceil(words.length / 2);

  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function isLegalHeading(value: string) {
  return legalHeadings.has(value);
}

const legalHeadings = new Set([
  "Who We Are",
  "Comments",
  "Media",
  "Cookies",
  "Embedded Content from Other Websites",
  "Who We Share Your Data With",
  "How Long We Retain Your Data",
  "What Rights You Have Over Your Data",
  "Where Your Data Is Sent",
]);

const storyHeadings = new Set(["The Heavenly Difference", "The Beginning"]);

const policyHeadings = new Set([
  "Returns & Exchanges",
  "Order Cancellations",
  "Damaged or Incorrect Orders",
]);

const storyValues = [
  "Cruelty Free",
  "Lightweight Feel",
  "Vegan And Conscious",
  "Self-Love Infused",
];

function renderTextWithLinks(value: string) {
  const parts = value.split(/(https?:\/\/[^\s]+)/g);

  return parts.map((part) =>
    part.startsWith("http") ? (
      <a className="text-black" href={part} key={part}>
        {part}
      </a>
    ) : (
      part
    ),
  );
}
