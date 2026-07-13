import Link from "next/link";

import { getFooterContent } from "@/lib/site-content";

const footerGroups = [
  { key: "about", label: "About", links: ["Our Story"] },
  { key: "shop", label: "Shop", links: ["Shop"] },
  { key: "care", label: "Care", links: ["Return", "FAQ"] },
] as const;

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v9h4v-9h3.5l.5-4h-4V9c0-.7.3-1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect
        fill="none"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
        width="18"
        x="3"
        y="3"
      />
      <circle
        cx="12"
        cy="12"
        fill="none"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" />
    </svg>
  );
}

export async function Footer() {
  const { settings, links } = await getFooterContent();
  const socialLinks = links.social?.length
    ? links.social
    : [
        {
          id: "footer-facebook",
          label: "Facebook",
          href: "https://www.facebook.com/profile.php?id=61580848234817",
        },
        {
          id: "footer-instagram",
          label: "Instagram",
          href: "https://www.instagram.com/heavenbeauty.lb",
        },
      ];
  const legalLinks = links.legal?.length
    ? links.legal
    : [
        {
          id: "footer-terms",
          label: "Terms & Conditions",
          href: "/terms-conditions",
        },
        {
          id: "footer-privacy",
          label: "Privacy Policy",
          href: "/privacy-policy",
        },
      ];
  const email = settings.cta_label || "service@myheavenbeauty.com";
  const phone = (settings.cta_href || "+961 78 835 078").replace(
    /^WhatsApp:\s*/i,
    "",
  );

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <div className="site-footer-brand-row">
          <span className="site-footer-brand-line" aria-hidden="true" />
          <Link className="site-footer-brand-name" href="/">
            {settings.title}
          </Link>
          <span className="site-footer-brand-line" aria-hidden="true" />
        </div>
      </div>

      <div className="site-footer-main">
        <div className="site-footer-main-inner">
          <a className="site-footer-phone" href={`tel:${phone}`}>
            {phone}
          </a>

          <nav className="site-footer-nav" aria-label="Footer navigation">
            {footerGroups.map((group) => {
              const groupLinks = (links[group.key] ?? []).filter((link) =>
                group.links.some(
                  (label) => label.toLowerCase() === link.label.toLowerCase(),
                ),
              );

              return (
                <div className="site-footer-group" key={group.key}>
                  <p className="site-footer-group-title">{group.label}</p>
                  <div className="site-footer-group-links">
                    {groupLinks.map((link) => (
                      <Link href={link.href} key={link.id}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <a className="site-footer-email" href={`mailto:${email}`}>
            {email}
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="site-footer-bottom-inner">
          <p className="site-footer-copyright">
            Copyright © {new Date().getFullYear()}&nbsp;
            <a href="https://nextlb.co/" rel="noreferrer" target="_blank">
              Nextlb. All rights reserved.
            </a>
          </p>

          <div className="site-footer-social" aria-label="Social media links">
            {socialLinks.map((link) => {
              const isInstagram = link.label.toLowerCase().includes("instagram");

              return (
                <a
                  aria-label={link.label}
                  href={link.href}
                  key={link.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isInstagram ? (
                    <InstagramIcon />
                  ) : (
                    <FacebookIcon />
                  )}
                </a>
              );
            })}
          </div>

          <nav className="site-footer-legal" aria-label="Legal links">
            {legalLinks.map((link) => (
              <Link href={link.href} key={link.id}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
