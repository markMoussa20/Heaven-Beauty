import { ProductCard } from "@/components/products/ProductCard";
import type { Category, CountryItemWithProduct } from "@/types/database";

type ProductGridProps = { items: CountryItemWithProduct[]; selectedCountryName: string };
type Section = { category: Category | null; items: CountryItemWithProduct[] };

export function ProductGrid({ items, selectedCountryName }: ProductGridProps) {
  const sections = groupByCategory(items);
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

  return <div className="space-y-12">{sections.map((section) => (
    <section className="space-y-7" key={section.category?.id ?? "uncategorized"}>
      <div className="text-center"><h2 className="text-5xl font-medium leading-tight text-[#6c93c4] sm:text-6xl">
        {section.category?.name ?? "More to Love"}
      </h2></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => <ProductCard item={item} key={item.id} />)}
      </div>
    </section>
  ))}</div>;
}

function groupByCategory(items: CountryItemWithProduct[]): Section[] {
  const groups = new Map<string, Section>();
  const sorted = [...items].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
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
