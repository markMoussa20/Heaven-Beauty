import { ProductCard } from "@/components/products/ProductCard";
import type { CountryItemWithProduct } from "@/types/database";

type ProductGridProps = {
  items: CountryItemWithProduct[];
  selectedCountryName: string;
};

const sections = [
  {
    title: "Heavenly Tints",
    match: (name: string) =>
      name.includes("heavenly") || (!name.includes("sparkly") && name.includes("tint")),
  },
  {
    title: "Sparkly Tints",
    match: (name: string) => name.includes("sparkly"),
  },
  {
    title: "Devotion",
    match: (name: string) => name.includes("devotion"),
  },
];

export function ProductGrid({ items, selectedCountryName }: ProductGridProps) {
  const groupedSections = sections
    .map((section) => ({
      ...section,
      items: items.filter((item) => section.match(item.products.name.toLowerCase())),
    }))
    .filter((section) => section.items.length > 0);

  const uncategorized = items.filter(
    (item) =>
      !sections.some((section) => section.match(item.products.name.toLowerCase())),
  );

  const visibleSections =
    groupedSections.length > 0
      ? [
          ...groupedSections,
          ...(uncategorized.length
            ? [{ title: "Featured Glow Picks", items: uncategorized }]
            : []),
        ]
      : [{ title: "Featured Glow Picks", items }];

  if (items.length === 0) {
    return (
      <div className="border border-[#6c93c4]/20 bg-white p-10 text-center">
        <h3 className="text-4xl font-medium text-[#6c93c4]">
          Products are being prepared
        </h3>
        <p className="mx-auto mt-4 max-w-md text-sm font-light leading-7 text-[#6c93c4]">
          Add visible featured country items for {selectedCountryName} in
          Supabase to populate this refined shop section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {visibleSections.map((section) => (
        <section key={section.title} className="space-y-7">
          <div className="text-center">
            <h2 className="text-5xl font-medium leading-tight text-[#6c93c4] sm:text-6xl">
              {section.title}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
