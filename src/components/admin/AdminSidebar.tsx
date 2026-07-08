import Link from "next/link";
import {
  Boxes,
  ChartNoAxesCombined,
  FolderTree,
  Globe2,
  LayoutPanelTop,
  LayoutDashboard,
  MapPinned,
  Package,
  ReceiptText,
  Truck,
  Users,
} from "lucide-react";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/countries", label: "Countries", icon: Globe2 },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/country-items", label: "Country Items", icon: Boxes },
  { href: "/admin/content", label: "Content", icon: LayoutPanelTop },
  { href: "/admin/shipping", label: "Shipping", icon: Truck },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/exchange-rates", label: "Exchange Rates", icon: ChartNoAxesCombined },
  { href: "/", label: "Public Site", icon: MapPinned },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 border-r border-zinc-200 bg-zinc-950 text-white lg:block">
      <div className="p-5">
        <p className="text-lg font-semibold">Heaven Beauty</p>
        <p className="text-xs uppercase tracking-wide text-zinc-400">Admin</p>
      </div>
      <nav className="grid gap-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
