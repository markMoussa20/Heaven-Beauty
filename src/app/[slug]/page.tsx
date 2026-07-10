import { PublicPageView } from "@/components/pages/PublicPageView";
import { getPublicPageFaqItems } from "@/lib/public-page-faq-items";
import { getPublicPage } from "@/lib/public-pages";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug);

  return {
    title: page.title,
    description: page.subtitle || page.body?.slice(0, 150) || undefined,
  };
}

export default async function PublicSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  const faqItems = await getPublicPageFaqItems(page.slug);

  return <PublicPageView faqItems={faqItems} page={page} />;
}
