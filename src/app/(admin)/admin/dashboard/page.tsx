import Link from "next/link";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { listRows } from "@/lib/admin/data";

export const metadata = { title: "Dashboard" };

const cards = [
  { label: "Countries", table: "countries", href: "/admin/countries" },
  { label: "Products", table: "products", href: "/admin/products" },
  { label: "Country Items", table: "country_items", href: "/admin/country-items" },
  { label: "Content Pages", table: "public_pages", href: "/admin/content" },
  { label: "Homepage Blocks", table: "site_content", href: "/admin/content" },
  { label: "Footer Links", table: "footer_links", href: "/admin/content" },
  { label: "Orders", table: "orders", href: "/admin/orders" },
  { label: "Customers", table: "customers", href: "/admin/customers" },
];

export default async function AdminDashboardPage() {
  const counts = await Promise.all(
    cards.map(async (card) => ({
      ...card,
      count: (await listRows(card.table)).data.length,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Manage Heaven Beauty catalog, countries, prices, orders, and customers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((card) => (
          <Link
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            href={card.href}
            key={card.table}
          >
            <p className="text-sm text-zinc-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.count}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Store rules</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone="blue">Prices come from country_items</StatusBadge>
          <StatusBadge tone="green">Service role stays server-only</StatusBadge>
          <StatusBadge tone="yellow">Orders are not deleted by default</StatusBadge>
        </div>
      </div>
    </div>
  );
}
