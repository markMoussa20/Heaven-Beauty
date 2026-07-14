import { ProductCard } from "@/components/products/ProductCard";
import type { Category, CountryItemWithProduct } from "@/types/database";

type ProductGridProps = {
  groupByCategory?: boolean;
  hideSectionTitles?: boolean;
  items: CountryItemWithProduct[];
  preserveItemOrder?: boolean;
  selectedCountryName: string;
};
type Section = { category: Category | null; items: CountryItemWithProduct[] };

export function ProductGrid({
  groupByCategory: shouldGroupByCategory = true,
  hideSectionTitles = false,
  items,
  preserveItemOrder = false,
  selectedCountryName,
}: ProductGridProps) {
  const sections = shouldGroupByCategory
    ? groupByCategory(items, preserveItemOrder)
    : [{ category: null, items }];
  if (items.length === 0) {
    return (
      <div className="border border-[#6c93c4]/20 bg-white p-10 text-center">
        <h3 className="text-4xl font-medium text-[#6c93c4]">Products are being prepared</h3>
        <p className="mx-auto mt-4 max-w-md text-sm font-light leading-7 text-[#6c93c4]">
          Products for {selectedCountryName} will appear here as soon as they are available.
        </p>
      </div>
    );
  }

  return <div className="space-y-10 sm:space-y-12">{sections.map((section) => (
    <section className="space-y-7" key={section.category?.id ?? "uncategorized"}>
      {!hideSectionTitles ? (
        <div className="text-center"><h2 className="text-[2rem] font-normal leading-tight text-[#6c93c4] sm:text-5xl lg:text-6xl">
          {section.category?.name ?? "More to Love"}
        </h2></div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {section.items.map((item) => <ProductCard item={item} key={item.id} />)}
      </div>
    </section>
  ))}</div>;
}

function groupByCategory(items: CountryItemWithProduct[], preserveItemOrder: boolean): Section[] {
  const groups = new Map<string, Section>();
  const sorted = preserveItemOrder
    ? items
    : [...items].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  for (const item of sorted) {
    const activeCategories = (item.products.product_categories ?? [])
      .map((relation) => relation.categories)
      .filter((category): category is Category => Boolean(category?.is_active))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    const category = activeCategories[0] ?? null;
    const key = category?.id ?? "uncategorized";
    const group = groups.get(key) ?? { category, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => Number(a.category?.sort_order ?? 999999) - Number(b.category?.sort_order ?? 999999));
}
