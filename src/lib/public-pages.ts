import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { PublicPage } from "@/types/database";

const pageAliases: Record<string, string> = {
  privacy: "privacy-policy",
  return: "return-cancellations",
  terms: "terms-conditions",
};

export const defaultPages: PublicPage[] = [
  {
    id: "default-our-story",
    slug: "our-story",
    title: "Welcome To Heaven Beauty",
    subtitle: "The story",
    body:
      "Founded by Lebanese beauty influencer Sarah Hammoud, the brand was born from years of testing, reviewing, and understanding what truly works. Each product is designed as a one-step essential: simple, effective, and refined.",
    cta_label: "Shop now",
    cta_href: "/shop",
    image_url: "/images/our-story-founder.jpeg",
    image_alt: "Heaven Beauty founder",
    secondary_image_url: "/images/our-story-products.jpg",
    secondary_image_alt: "Heaven Beauty tint products",
    sort_order: 10,
    is_active: true,
  },
  {
    id: "default-contact",
    slug: "contact",
    title: "Contact",
    subtitle: "We are here to help",
    body:
      "For product questions, order updates, and support, contact service@myheavenbeauty.com or call +961 78 835 078.",
    cta_label: "Email us",
    cta_href: "mailto:service@myheavenbeauty.com",
    sort_order: 20,
    is_active: true,
  },
  {
    id: "default-return-cancellations",
    slug: "return-cancellations",
    title: "Return & Cancellations",
    subtitle: "Store policy",
    body:
      "Returns & Exchanges\n\nFor hygiene and safety reasons, we do not accept returns or exchanges on any products once purchased.\n\nOrder Cancellations\n\nOrders may only be canceled within a short time after being placed. Once an order has been processed or shipped, it can no longer be canceled.\n\nDamaged or Incorrect Orders\n\nIf you receive a damaged or incorrect item, please contact us within 48 hours of delivery. Our team will review your request and assist you accordingly.",
    sort_order: 30,
    is_active: true,
  },
  {
    id: "default-faq",
    slug: "faq",
    title: "Faq",
    subtitle: "Questions",
    body:
      "If you have other questions we weren't able to address here, feel free to email.\n\ninfo@myheavenbeauty.com",
    sort_order: 40,
    is_active: true,
  },
  {
    id: "default-privacy-policy",
    slug: "privacy-policy",
    title: "Privacy Policy",
    subtitle: "Privacy",
    body:
      "Who We Are\n\nHeaven Beauty is an online beauty brand offering lip and cheek tints. Our website address is: https://aqua-clam-453674.hostingersite.com\n\nComments\n\nWhen visitors leave comments on the site, we collect the data shown in the comments form, along with the visitor's IP address and browser user agent to help detect spam.\n\nAn anonymized string (hash) created from your email address may be provided to the Gravatar service to check if you are using it. After approval, your profile picture may be visible publicly alongside your comment.\n\nMedia\n\nIf you upload images to the website, you should avoid uploading images with embedded location data (EXIF GPS). Visitors may be able to download and extract location data from images on the site.\n\nCookies\n\nIf you leave a comment, you may opt in to saving your name, email, and website in cookies for convenience. These cookies will last for one year.\n\nIf you visit our login page, a temporary cookie will be set to determine if your browser accepts cookies. This cookie contains no personal data and is deleted when you close your browser.\n\nWhen you log in, we set cookies to save your login information and display preferences. Login cookies last for two days, and screen option cookies last for one year. Selecting Remember Me will keep you logged in for two weeks. Logging out removes these cookies.\n\nIf you edit or publish content, a cookie will be stored indicating the post ID. It contains no personal data and expires after one day.\n\nEmbedded Content from Other Websites\n\nArticles on this site may include embedded content such as videos or images. Embedded content behaves the same as if you visited the external website directly.\n\nThese third-party websites may collect data, use cookies, and monitor your interaction with their content.\n\nWho We Share Your Data With\n\nWe do not sell or trade your personal data. If you request a password reset, your IP address may be included in the reset email for security purposes.\n\nHow Long We Retain Your Data\n\nIf you leave a comment, the comment and its metadata are stored indefinitely to allow automatic approval of follow-ups.\n\nFor registered users (if applicable), we store the personal information provided in their profile. Users can view, edit, or delete their personal information at any time (except usernames).\n\nWhat Rights You Have Over Your Data\n\nIf you have an account or have left comments, you may request a copy of the personal data we hold about you. You may also request that we delete your personal data, except for data we are required to retain for legal or security reasons.\n\nWhere Your Data Is Sent\n\nVisitor comments may be checked through automated spam detection services to ensure site security and integrity.",
    sort_order: 50,
    is_active: true,
  },
  {
    id: "default-terms-conditions",
    slug: "terms-conditions",
    title: "Terms & Conditions",
    subtitle: "Store terms",
    body:
      "These terms describe the conditions for using Heaven Beauty, placing orders, and accessing customer support.",
    sort_order: 60,
    is_active: true,
  },
  {
    id: "default-shop",
    slug: "shop",
    title: "Shop",
    subtitle: "Heaven Beauty essentials",
    body:
      "Explore Heaven Beauty tints and glow essentials available for your selected country.",
    sort_order: 70,
    is_active: true,
  },
];

export function normalizePageSlug(slug: string) {
  const normalized = slug.replace(/^\/+|\/+$/g, "").toLowerCase();
  return pageAliases[normalized] ?? normalized;
}

export async function getPublicPage(slug: string): Promise<PublicPage> {
  const normalizedSlug = normalizePageSlug(slug);
  const fallback = defaultPages.find((page) => page.slug === normalizedSlug);

  if (!fallback) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_pages")
    .select("*")
    .eq("slug", normalizedSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const page = data as PublicPage;
  const imageUrl =
    normalizedSlug === "our-story"
      ? storyImageWithFallback(page.image_url, fallback.image_url)
      : withFallback(page.image_url, fallback.image_url);
  const body =
    normalizedSlug === "return-cancellations"
      ? returnBodyWithFallback(page.body, fallback.body)
      : withFallback(page.body, fallback.body);

  return {
    ...fallback,
    ...page,
    slug: normalizedSlug,
    title: withFallback(page.title, fallback.title) ?? fallback.title,
    subtitle: withFallback(page.subtitle, fallback.subtitle),
    body,
    cta_label: withFallback(page.cta_label, fallback.cta_label),
    cta_href: withFallback(page.cta_href, fallback.cta_href),
    image_url: imageUrl,
    image_alt: withFallback(page.image_alt, fallback.image_alt),
    secondary_image_url: withFallback(
      page.secondary_image_url,
      fallback.secondary_image_url,
    ),
    secondary_image_alt: withFallback(
      page.secondary_image_alt,
      fallback.secondary_image_alt,
    ),
  };
}

function withFallback<T extends string | null | undefined>(
  value: T,
  fallback: T,
) {
  return typeof value === "string" && value.trim().length === 0
    ? fallback
    : value || fallback;
}

function storyImageWithFallback(
  value: string | null | undefined,
  fallback: string | null | undefined,
) {
  if (value?.includes("IMG_2398.JPG-scaled.jpeg")) {
    return fallback;
  }

  return withFallback(value, fallback);
}

function returnBodyWithFallback(
  value: string | null | undefined,
  fallback: string | null | undefined,
) {
  if (value?.startsWith("If you need help with a return")) {
    return fallback;
  }

  return withFallback(value, fallback);
}
