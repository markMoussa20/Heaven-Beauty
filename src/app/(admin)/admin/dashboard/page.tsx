import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { getDashboardAnalytics } from "@/lib/admin/dashboard-analytics";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const analytics = await getDashboardAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A live view of orders, customers, and storefront activity.
        </p>
      </div>
      <DashboardCharts analytics={analytics} />
    </div>
  );
}
