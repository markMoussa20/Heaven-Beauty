import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PublicPageFaqItem } from "@/types/database";

export async function getPublicPageFaqItems(pageSlug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_page_faq_items")
    .select("*")
    .eq("page_slug", pageSlug)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load FAQ items", error);
    return defaultFaqItems.filter((item) => item.page_slug === pageSlug);
  }

  const items = (data ?? []) as PublicPageFaqItem[];
  return items.length > 0
    ? items
    : defaultFaqItems.filter((item) => item.page_slug === pageSlug);
}

export const defaultFaqItems: PublicPageFaqItem[] = [
  {
    id: "default-faq-out-of-stock",
    page_slug: "faq",
    group_title: "Orders",
    question: "What if the item I want is out of stock?",
    answer:
      "During our sale, products sell out fast! But don't despair. If the item you're looking for is out of stock, keep checking back. We're always updating and restocking our site with your faves!",
    sort_order: 10,
    is_active: true,
  },
  {
    id: "default-faq-track-order",
    page_slug: "faq",
    group_title: "Orders",
    question: "How do I track my order?",
    answer:
      "When your order is shipped from our warehouse, we will send you an email to confirm your shipment.",
    sort_order: 20,
    is_active: true,
  },
  {
    id: "default-faq-change-order",
    page_slug: "faq",
    group_title: "Orders",
    question: "How do I change or cancel my order?",
    answer:
      "We do not normally accept order cancellations or changes once an order has been processed.",
    sort_order: 30,
    is_active: true,
  },
  {
    id: "default-faq-vegan",
    page_slug: "faq",
    group_title: "Products",
    question: "Are your products vegan and cruelty-free?",
    answer:
      "Yes, all Heaven Beauty products are 100% vegan and cruelty-free. We never test on animals and are committed to conscious beauty.",
    sort_order: 40,
    is_active: true,
  },
  {
    id: "default-faq-lips-cheeks",
    page_slug: "faq",
    group_title: "Products",
    question: "Can I use the tints on both lips and cheeks?",
    answer:
      "Absolutely. Our tints are designed as multi-use essentials, perfect for both lips and cheeks for an effortless, natural glow.",
    sort_order: 50,
    is_active: true,
  },
  {
    id: "default-faq-long-lasting",
    page_slug: "faq",
    group_title: "Products",
    question: "Are your tints long-lasting?",
    answer:
      "Yes, our formulas are lightweight yet long-wearing, designed to stay fresh and radiant throughout the day.",
    sort_order: 60,
    is_active: true,
  },
  {
    id: "default-faq-skin-types",
    page_slug: "faq",
    group_title: "Products",
    question: "Are your products suitable for all skin types?",
    answer:
      "Our tints are created to suit all skin types, offering buildable color that blends seamlessly into your natural complexion.",
    sort_order: 70,
    is_active: true,
  },
];
