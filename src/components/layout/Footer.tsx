import Link from "next/link";

import { shell } from "@/lib/design";
import { getFooterContent } from "@/lib/site-content";

const footerGroups = [
  { key: "about", label: "About" },
  { key: "shop", label: "Shop" },
  { key: "care", label: "Care" },
];

export async function Footer() {
  const { settings, links } = await getFooterContent();
  const socialLinks = links.social ?? [];

  return (
    <footer className="border-t border-[#171412] bg-[#171412] text-[#f8ede8]">
      <div
        className={`${shell} grid gap-9 py-12 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.7fr_0.7fr_0.8fr]`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tracking-wide">
              {settings.title}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#d8b7a9]">
              {settings.subtitle}
            </p>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#d8ccc6]">
            {settings.body}
          </p>
          <div className="space-y-2 text-sm text-[#d8ccc6]">
            {settings.cta_label ? <p>{settings.cta_label}</p> : null}
            {settings.cta_href ? <p>{settings.cta_href}</p> : null}
          </div>
        </div>
        {footerGroups.map((group) => (
          <div key={group.key}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d8b7a9]">
              {group.label}
            </p>
            <div className="mt-4 grid gap-3 text-sm text-[#f8ede8]">
              {(links[group.key] ?? []).map((link) =>
                link.is_external ? (
                  <a
                    href={link.href}
                    key={link.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} key={link.id}>
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div
          className={`${shell} flex flex-col gap-3 py-5 text-xs text-[#bdaea7] sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>{settings.marquee_text}</p>
          <div className="flex gap-4">
            {socialLinks.map((link) => (
              <a
                href={link.href}
                key={link.id}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
