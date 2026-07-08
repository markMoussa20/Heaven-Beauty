import { PublicPageView } from "@/components/pages/PublicPageView";
import { getPublicPageFaqItems } from "@/lib/public-page-faq-items";
import { getPublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

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
