import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductDetail } from "@/components/products/ProductDetail";
import { ProductCard } from "@/components/products/ProductCard";
import { getSelectedCountryCode } from "@/lib/country";
import { getVisibleCountryItems } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { getProductImageUrl } from "@/lib/storage/product-images";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const countryCode = await getSelectedCountryCode();
  const items = await getVisibleCountryItems(countryCode);
  const item = items.find((candidate) => candidate.products.slug === slug);

  return {
    title: item?.products.name ?? "Product",
    description: item?.products.short_description ?? item?.products.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const countryCode = await getSelectedCountryCode();
  const items = await getVisibleCountryItems(countryCode);
  const item = items.find((candidate) => candidate.products.slug === slug);

  if (!item) {
    notFound();
  }

  const supabase = await createClient();
  const product = item.products;
  const imagePaths = [
    product.main_image_path,
    ...(product.product_images ?? [])
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .map((image) => image.storage_path),
    ...(product.gallery_image_paths ?? []),
  ].filter((path, index, paths): path is string => Boolean(path) && paths.indexOf(path) === index);
  const imageUrls = [product.main_image_url, ...imagePaths.map((path) => getProductImageUrl(supabase, path))]
    .filter((url, index, urls): url is string => Boolean(url) && urls.indexOf(url) === index);
  const relatedItems = items
    .filter((candidate) => candidate.id !== item.id)
    .slice(0, 4);

  return (
    <main className="bg-[#e6ecf4] text-[#6c93c4]">
      <ProductDetail imageUrls={imageUrls} item={item} />
      {relatedItems.length > 0 ? (
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-4 sm:px-8 lg:px-10 lg:pb-24">
          <h2 className="text-[28px] font-normal text-[#6c93c4] sm:text-4xl">Related Products</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {relatedItems.map((relatedItem) => (
              <ProductCard item={relatedItem} key={relatedItem.id} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
