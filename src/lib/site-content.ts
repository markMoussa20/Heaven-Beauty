import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { FooterLink, SiteContent } from "@/types/database";

export type HomeContent = {
  tintRadiance: SiteContent;
  imageShowcase: SiteContent;
  pureIntro: SiteContent;
  story: SiteContent;
  difference: SiteContent;
  marquee: SiteContent;
};

export type FooterContent = {
  settings: SiteContent;
  links: Record<string, FooterLink[]>;
};

const homeDefaults: HomeContent = {
  tintRadiance: {
    id: "default-home-tint-radiance",
    key: "home_tint_radiance",
    title: "Where Tint Meets Radiance",
    body: "A touch of color designed to enhance your natural glow - soft, radiant, and effortlessly you.",
    cta_label: "Our Story",
    cta_href: "#our-story",
    is_active: true,
    sort_order: 10,
  },
  imageShowcase: {
    id: "default-home-image-showcase",
    key: "home_image_showcase",
    title: "Your glow speaks for itself we simply enhance it",
    image_url:
      "https://myheavenbeauty.com/wp-content/uploads/2026/04/IMG_2398.JPG-scaled.jpeg",
    image_alt: "Heaven Beauty product glow image",
    secondary_image_url:
      "https://myheavenbeauty.com/wp-content/uploads/2026/03/heavenbeauty.lb_1762448458_3760012651565741825_65902285909.jpg",
    secondary_image_alt: "Heaven Beauty skin tint image",
    is_active: true,
    sort_order: 20,
  },
  pureIntro: {
    id: "default-home-pure-intro",
    key: "home_pure_intro",
    title: "The first of its kind",
    subtitle: "Introducing PURE",
    body: "A soft, light pink created to enhance your natural beauty, blending seamlessly into your skin for a fresh, radiant glow that feels effortless and true to you.",
    cta_label: "Shop",
    cta_href: "#featured-products",
    is_active: true,
    sort_order: 30,
  },
  story: {
    id: "default-home-story",
    key: "home_story",
    title: "Our Story",
    body: "Heaven Beauty was created to redefine beauty as something effortless, intentional, and true to you. We design products that enhance your natural features, not mask them - starting with our signature tints and evolving into a full range of skin-friendly essentials that feel as good as they look.",
    cta_label: "Discover more",
    cta_href: "/our-story",
    is_active: true,
    sort_order: 40,
  },
  difference: {
    id: "default-home-difference",
    key: "home_difference",
    title: "Our Difference",
    body: "Designed with good intention, made to feel like nothing on your skin. Our long-lasting, blendable tints adapt to every tone, leaving a soft, radiant glow - gentle even for sensitive skin.",
    is_active: true,
    sort_order: 50,
  },
  marquee: {
    id: "default-home-marquee",
    key: "home_marquee",
    marquee_text:
      "~ For a natural glow ~ Its organic ~ For a natural glow ~ Its organic ~ For a natural glow ~ Its organic ~",
    is_active: true,
    sort_order: 60,
  },
};

const footerSettingsDefault: SiteContent = {
  id: "default-footer-settings",
  key: "footer_settings",
  title: "Heaven Beauty",
  subtitle: "Beauty Store",
  body: "Effortless beauty essentials made to enhance your natural glow.",
  cta_label: "service@myheavenbeauty.com",
  cta_href: "WhatsApp: +961 78 835 078",
  marquee_text: "Copyright 2026 Heaven Beauty. All rights reserved.",
  is_active: true,
};

const footerLinksDefault: FooterLink[] = [
  { id: "default-about-story", group_key: "about", label: "Our Story", href: "/our-story", sort_order: 10, is_active: true },
  { id: "default-about-contact", group_key: "about", label: "Contact", href: "/contact", sort_order: 20, is_active: true },
  { id: "default-shop-home", group_key: "shop", label: "Home", href: "/", sort_order: 10, is_active: true },
  { id: "default-shop-shop", group_key: "shop", label: "Shop", href: "/shop", sort_order: 20, is_active: true },
  { id: "default-shop-tints", group_key: "shop", label: "Heavenly Tints", href: "#featured-products", sort_order: 30, is_active: true },
  { id: "default-care-return", group_key: "care", label: "Return", href: "/return-cancellations", sort_order: 10, is_active: true },
  { id: "default-care-faq", group_key: "care", label: "FAQ", href: "/faq", sort_order: 20, is_active: true },
  { id: "default-care-terms", group_key: "care", label: "Terms & Conditions", href: "/terms-conditions", sort_order: 30, is_active: true },
  { id: "default-care-privacy", group_key: "care", label: "Privacy Policy", href: "/privacy-policy", sort_order: 40, is_active: true },
  { id: "default-social-facebook", group_key: "social", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61580848234817", sort_order: 10, is_active: true, is_external: true },
  { id: "default-social-instagram", group_key: "social", label: "Instagram", href: "https://www.instagram.com/heavenbeauty.lb", sort_order: 20, is_active: true, is_external: true },
];

const homeKeys = Object.values(homeDefaults).map((block) => block.key);

function mergeHomeContent(rows: SiteContent[]): HomeContent {
  const next = { ...homeDefaults };
  for (const row of rows) {
    const targetKey = Object.keys(homeDefaults).find(
      (key) => homeDefaults[key as keyof HomeContent].key === row.key,
    ) as keyof HomeContent | undefined;

    if (targetKey) {
      next[targetKey] = { ...homeDefaults[targetKey], ...row };
    }
  }

  return next;
}

function groupFooterLinks(links: FooterLink[]) {
  const normalizedLinks = links.map(canonicalizeFooterLink);
  const uniqueLinks = normalizedLinks.reduce<Record<string, FooterLink>>((next, link) => {
    const key = `${link.group_key}:${link.label.toLowerCase()}`;
    const current = next[key];

    if (
      !current ||
      (link.sort_order ?? 0) >= (current.sort_order ?? 0) ||
      link.href !== current.href
    ) {
      next[key] = link;
    }

    return next;
  }, {});

  return Object.values(uniqueLinks).reduce<Record<string, FooterLink[]>>(
    (groups, link) => {
      const group = groups[link.group_key] ?? [];
      group.push(link);
      groups[link.group_key] = group.sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      return groups;
    },
    {},
  );
}

function canonicalizeFooterLink(link: FooterLink): FooterLink {
  if (link.group_key !== "social") {
    return link;
  }

  const normalizedLabel = link.label.toLowerCase();

  if (normalizedLabel === "facebook") {
    return {
      ...link,
      href: "https://www.facebook.com/profile.php?id=61580848234817",
      is_external: true,
    };
  }

  if (normalizedLabel === "instagram") {
    return {
      ...link,
      href: "https://www.instagram.com/heavenbeauty.lb",
      is_external: true,
    };
  }

  return link;
}

export async function getHomeContent(): Promise<HomeContent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("*")
    .in("key", homeKeys)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch home content", error);
    return homeDefaults;
  }

  return mergeHomeContent((data ?? []) as SiteContent[]);
}

export async function getFooterContent(): Promise<FooterContent> {
  const supabase = await createClient();
  const [settingsResult, linksResult] = await Promise.all([
    supabase
      .from("site_content")
      .select("*")
      .eq("key", "footer_settings")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("footer_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (settingsResult.error || linksResult.error) {
    console.error("Failed to fetch footer content", {
      settings: settingsResult.error,
      links: linksResult.error,
    });
    return {
      settings: footerSettingsDefault,
      links: groupFooterLinks(footerLinksDefault),
    };
  }

  const footerLinks = (linksResult.data ?? []) as FooterLink[];

  return {
    settings: {
      ...footerSettingsDefault,
      ...((settingsResult.data as SiteContent | null) ?? {}),
    },
    links: groupFooterLinks(
      footerLinks.length > 0 ? footerLinks : footerLinksDefault,
    ),
  };
}
