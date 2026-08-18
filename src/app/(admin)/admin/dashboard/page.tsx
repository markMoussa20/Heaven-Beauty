import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { DashboardRangePicker } from "@/components/admin/DashboardRangePicker";
import { getDashboardAnalytics } from "@/lib/admin/dashboard-analytics";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const analytics = await getDashboardAnalytics(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A live view of orders, customers, and storefront activity.
        </p>
      </div>
      <DashboardRangePicker range={analytics.range} />
      <DashboardCharts analytics={analytics} />
    </div>
  );
}
