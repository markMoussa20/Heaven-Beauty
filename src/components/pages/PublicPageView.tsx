import Link from "next/link";

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
    return <FaqPageView faqItems={faqItems} page={page} />;
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

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <section className={`${shell} pb-16 pt-40 lg:pb-24 lg:pt-52`}>
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9eb9d9]">
              {page.subtitle ?? "Policy"}
            </p>
            <h1 className="mt-6 text-[3.7rem] font-medium leading-[0.92] text-[#86a3d3] sm:text-[6.2rem] lg:text-[7rem]">
              Return
              <span className="block sm:pl-[10vw] lg:pl-20">& Cancellations</span>
            </h1>
          </div>
          <div className="space-y-4">
            {sections.map((section, index) => (
              <section
                className="group relative overflow-hidden border border-[#9eb9d9]/20 bg-white/45 px-5 py-7 transition duration-500 hover:-translate-y-1 hover:bg-white/75 hover:shadow-[0_24px_70px_rgba(108,147,196,0.14)] sm:px-8"
                key={section.heading}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-[#9eb9d9]/45 opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-[#9eb9d9]/45 text-sm font-semibold text-[#86a3d3] transition duration-500 group-hover:border-[#86a3d3] group-hover:bg-[#86a3d3] group-hover:text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-3xl font-medium leading-tight text-[#171412]">
                      {section.heading}
                    </h2>
                    <div className="mt-5 space-y-5 text-lg font-light leading-9 text-[#6c93c4]">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FaqPageView({
  faqItems,
  page,
}: {
  faqItems: PublicPageFaqItem[];
  page: PublicPage;
}) {
  const groups = groupFaqItems(faqItems);

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <section className={`${shell} pb-12 pt-36 lg:pb-16 lg:pt-48`}>
        <div className="relative overflow-hidden border-b border-[#9eb9d9]/35 pb-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.56fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9eb9d9]">
                Help center
              </p>
              <h1 className="mt-5 text-[5.8rem] font-medium leading-[0.86] text-[#86a3d3] sm:text-[7.5rem] lg:text-[9rem]">
                Questions
                <span className="block pl-[12vw] lg:pl-32">& Answers</span>
              </h1>
            </div>
            <div className="translate-y-0 bg-white/55 p-6 shadow-[0_22px_70px_rgba(108,147,196,0.12)] transition duration-500 hover:-translate-y-1 hover:bg-white/75">
              <p className="text-xl font-light leading-9">
                If you have other questions we weren&apos;t able to address here,
                feel free to email.
              </p>
              <a
                className="mt-6 inline-flex border-b border-[#6c93c4] pb-1 text-sm font-semibold uppercase tracking-[0.2em] transition hover:opacity-65"
                href="mailto:info@myheavenbeauty.com"
              >
                info@myheavenbeauty.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <QaCollection groups={groups} />

      <section className={`${shell} pb-24`}>
        <div className="border-t border-[#9eb9d9]/35 pt-8 text-center">
          <h2 className="text-4xl font-medium text-[#86a3d3]">{page.title}</h2>
        </div>
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
    <section className={`${shell} ${compact ? "pb-20" : "pb-24"}`}>
      <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-[#9eb9d9]/25 bg-white/45 p-5 shadow-[0_22px_70px_rgba(108,147,196,0.09)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9eb9d9]">
              Browse by topic
            </p>
            <div className="mt-6 grid gap-3">
              {groups.map((group, index) => (
                <a
                  className="group flex items-center justify-between border-b border-[#9eb9d9]/25 pb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#171412] transition duration-300 hover:translate-x-1 hover:text-[#86a3d3]"
                  href={`#qa-${slugifyId(group.title)}`}
                  key={group.title}
                >
                  <span>{group.title}</span>
                  <span className="text-[#9eb9d9]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-14">
          {groups.map((group, groupIndex) => (
            <section
              className="scroll-mt-32"
              id={`qa-${slugifyId(group.title)}`}
              key={group.title}
            >
              <div className="mb-6 grid gap-3 border-b border-[#9eb9d9]/35 pb-5 sm:grid-cols-[auto_1fr] sm:items-end">
                <span className="text-sm font-semibold tracking-[0.32em] text-[#9eb9d9]">
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <h2 className="text-4xl font-medium leading-tight text-[#171412] sm:text-5xl">
                  {group.title}
                </h2>
              </div>

              <div className="grid gap-4">
                {group.items.map((item, index) => (
                  <QaAccordionItem
                    index={index + 1}
                    item={item}
                    key={item.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function QaAccordionItem({
  index,
  item,
}: {
  index: number;
  item: PublicPageFaqItem;
}) {
  return (
    <details className="group overflow-hidden border border-transparent bg-white/45 transition duration-500 hover:-translate-y-1 hover:border-[#9eb9d9]/30 hover:bg-white/65 hover:shadow-[0_22px_70px_rgba(108,147,196,0.12)] open:border-[#9eb9d9]/30 open:bg-white open:shadow-[0_30px_90px_rgba(108,147,196,0.17)]">
      <summary className="grid cursor-pointer list-none gap-5 px-5 py-6 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-[#86a3d3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e6ecf4] group-open:pb-4 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:px-8 [&::-webkit-details-marker]:hidden">
        <span className="grid h-12 w-12 place-items-center border border-[#9eb9d9]/40 text-sm font-semibold text-[#86a3d3] transition duration-500 group-open:border-[#86a3d3] group-open:bg-[#86a3d3] group-open:text-white">
          {String(index).padStart(2, "0")}
        </span>
        <span className="pr-4 text-xl font-medium leading-8 text-[#171412] transition duration-300 group-hover:text-[#86a3d3] sm:text-2xl">
          {item.question}
        </span>
        <span className="relative w-fit overflow-hidden pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#86a3d3]">
          <span className="transition duration-300 group-open:-translate-y-5 group-open:opacity-0">
            Read answer
          </span>
          <span className="absolute inset-x-0 top-0 translate-y-5 opacity-0 transition duration-300 group-open:translate-y-0 group-open:opacity-100">
            Hide answer
          </span>
          <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-100 bg-[#86a3d3] transition duration-500 group-hover:scale-x-75" />
        </span>
      </summary>

      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-out group-open:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mx-5 mb-6 border-t border-[#9eb9d9]/25 px-5 py-6 sm:mx-8 sm:ml-[8.5rem] sm:px-0">
            <div className="relative max-w-4xl bg-[#e6ecf4]/75 px-5 py-6 sm:px-7">
              <span className="absolute -left-3 top-6 hidden h-px w-10 bg-[#86a3d3]/50 sm:block" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9eb9d9]">
                Answer
              </p>
              <p className="mt-4 text-lg font-light leading-9 text-[#6c93c4]">
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </details>
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

function slugifyId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isStoryHeading(value: string) {
  return storyHeadings.has(value);
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
