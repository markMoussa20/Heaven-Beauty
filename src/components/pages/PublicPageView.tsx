import Link from "next/link";
import { Feather, Heart, Leaf, Rabbit } from "lucide-react";

import { ScrollTranslateY } from "@/components/home/ScrollTranslateY";
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
      <section className="relative min-h-[72vh] overflow-hidden pt-8 md:pt-28">
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
            <h1 className="mt-3 text-[2.7rem] font-medium leading-[1.05] sm:mt-5 sm:text-7xl lg:text-8xl">
              {page.title}
            </h1>
            {bodyBlocks[0] ? (
              <p className="mt-5 max-w-2xl text-base font-light leading-7 sm:mt-8 sm:text-xl sm:leading-9">
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

      {page.slug !== "contact" ? (
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
      ) : null}
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
      <section className={`${shell} pb-20 pt-12 md:pt-32 lg:pb-28 lg:pt-44`}>
        <div className="hb-fade-up max-w-[980px]">
          <h1 className="text-[2.35rem] font-normal leading-[1.08] text-[#6c93c4] sm:text-[4.4rem] lg:text-[5.4rem]">
            {titleLines[0]}
            {titleLines[1] ? (
              <span className="mt-1 block sm:mt-4">{titleLines[1]}</span>
            ) : null}
          </h1>
        </div>

        <div className="mt-9 max-w-[1120px] space-y-14 sm:mt-16 sm:space-y-20 lg:mt-20 lg:space-y-24">
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
      <section className={`${shell} pb-20 pt-12 md:pt-32 lg:pb-28 lg:pt-44`}>
        <div className="hb-fade-up max-w-[980px]">
          <h1 className="text-[2.35rem] font-normal leading-[1.08] text-[#6c93c4] sm:text-[4.4rem] lg:text-[5.4rem]">
            Frequently
            <span className="mt-1 block sm:mt-4">Asked Questions</span>
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
      className={`${compact ? "mt-10" : "mt-10 sm:mt-16 lg:mt-20"} max-w-[980px] space-y-10 sm:space-y-16`}
    >
      {groups.map((group) => (
        <section className="hb-fade-up" key={group.title}>
          <h2 className="text-xl font-normal leading-snug text-[#6c93c4] sm:text-2xl">
            {group.title}
          </h2>
            <div className="mt-4 divide-y divide-[#6c93c4]/18 border-y border-[#6c93c4]/18 sm:mt-6">
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
      <section className="relative px-5 pb-12 pt-14 text-center md:px-8 md:pb-16 md:pt-24 lg:pb-20 lg:pt-32">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-[#6c93c4]/80 sm:text-xs">
            Behind the glow
          </p>
          <div className="mt-5 flex items-center justify-center gap-4 sm:gap-7">
            <span className="h-px w-10 bg-[#86a3d3]/45 sm:w-20" aria-hidden="true" />
            <h1 className="whitespace-nowrap text-[2.75rem] font-light leading-none tracking-[-0.04em] text-[#6c93c4] sm:text-[4rem] lg:text-[5rem]">
              Our{" "}
              <span className="font-serif text-[1.08em] font-normal italic text-[#86a3d3]">
                Story
              </span>
            </h1>
            <span className="h-px w-10 bg-[#86a3d3]/45 sm:w-20" aria-hidden="true" />
          </div>
          <p className="mx-auto mt-6 max-w-[440px] text-[15px] font-light leading-relaxed text-[#6c93c4]/85 sm:text-base">
            Beauty made effortless, intentional, and true to you.
          </p>
        </div>
      </section>

      <section className="relative mb-20 lg:-mt-[50px] lg:mb-[140px]">
        <div className="mx-auto w-full max-w-[1260px] px-5 pb-20 pt-16 lg:px-0 lg:pb-[116px] lg:pt-[105px]">
          <div className="lg:w-[60%]">
            <h2 className="text-[28px] font-normal leading-[1.3] text-[#6c93c4]">
              {page.subtitle ?? "The story"}
            </h2>
            <p className="mt-5 text-[16px] font-light leading-[1.6] text-[#6c93c4]">
              {intro}
            </p>

            {page.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={page.image_alt ?? page.title}
                className="mt-9 aspect-[3/4] w-full object-cover object-center"
                src={page.image_url}
              />
            ) : null}

            <p className="mt-5 text-[16px] font-light leading-[1.6] text-[#6c93c4]">
              <strong className="font-semibold">
                {sections[1]?.heading ?? "The Heavenly Difference"}
              </strong>
              <br />
              {differenceParagraphs.join(" ")}
            </p>
          </div>
        </div>
      </section>

      {page.secondary_image_url ? (
        <>
          <section className="mx-auto w-full max-w-[1050px] px-5 pb-4 pt-16 text-center lg:h-[213px] lg:px-0 lg:pt-[115px]">
            <ScrollTranslateY maxPixels={100}>
              <h2 className="text-[28px] font-normal leading-[1.3] text-[#6c93c4]">
                {sections[2]?.heading ?? "The Beginning"}
              </h2>
            </ScrollTranslateY>
            {beginningParagraphs.map((paragraph) => (
              <ScrollTranslateY className="pt-5" key={paragraph} maxPixels={100}>
                <p className="text-[16px] font-light leading-[1.6] text-[#6c93c4]">
                  {paragraph}
                </p>
              </ScrollTranslateY>
            ))}
          </section>

          <section>
            <div className="mx-auto grid w-full max-w-[1260px] px-5 lg:grid-cols-[77fr_23fr] lg:px-0">
              <div className="lg:mb-[170px] lg:pr-[130px] lg:pt-[100px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={page.secondary_image_alt ?? "Heaven Beauty products"}
                  className="aspect-[5/4] w-full object-cover object-center"
                src={page.secondary_image_url}
              />
              </div>
              <div aria-hidden="true" />
            </div>
          </section>
        </>
      ) : null}

      <section className="px-5 pb-14 pt-16 md:px-8 md:pb-20 lg:pt-[70px]" aria-label="Heaven Beauty product values">
        <div className="mx-auto grid w-full max-w-[900px] grid-cols-2 gap-x-6 gap-y-12 text-center lg:grid-cols-4 lg:px-0">
          {storyValues.map(({ label, Icon }) => (
            <div className="flex flex-col items-center" key={label}>
              <Icon aria-hidden="true" className="h-11 w-11 stroke-[1.25]" />
              <h3 className="mt-[11px] w-full text-[16px] font-normal uppercase leading-6 text-[#6c93c4]">
                {label}
              </h3>
            </div>
          ))}
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
      <section className="mx-auto max-w-[1500px] px-6 pb-12 pt-12 md:pt-32 sm:px-10 sm:pb-16 lg:pt-52">
        <h1 className="hb-fade-up text-[2.6rem] font-medium leading-[1.05] tracking-normal text-[#86a3d3] sm:text-[6.5rem] sm:leading-[0.95] lg:text-[7.6rem]">
          <span>{firstTitleWord} ~</span>
          <span className="mt-2 block pl-[7vw] sm:mt-8">{titleRest.join(" ")}</span>
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
                  <h2 className="text-[1.75rem] font-medium leading-[1.2] text-[#7f9dd0] sm:text-5xl sm:leading-tight">
                    {section.heading}
                  </h2>
                  <div className="mt-5 space-y-5 text-base font-light leading-7 text-[#7f9dd0] sm:mt-6 sm:space-y-6 sm:text-lg sm:leading-8">
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
  { label: "Cruelty Free", Icon: Rabbit },
  { label: "Lightweight Feel", Icon: Feather },
  { label: "Vegan And Conscious", Icon: Leaf },
  { label: "Self-Love Infused", Icon: Heart },
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
