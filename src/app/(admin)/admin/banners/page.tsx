import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { PromoBannerForm } from "@/components/admin/forms/PromoBannerForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PromoBannerStrip } from "@/components/layout/PromoBannerStrip";
import { deletePromoBanner } from "@/lib/admin/promo-banner-actions";
import { requireAdmin } from "@/lib/admin/auth";
import { listPromoBanners, type AdminPromoBanner } from "@/lib/admin/data";
import {
  bannersOverlap,
  compareBannerPrecedence,
  getBannerStatus,
  normalizeWallClock,
} from "@/lib/promo-banners/schedule";
import type { Country } from "@/types/database";

export const metadata = { title: "Banners" };

function formatWallClock(value: string | null) {
  const normalized = normalizeWallClock(value);
  if (!normalized) return null;
  const [date, time] = normalized.split("T");
  return `${date} ${time.slice(0, 5)}`;
}

function countryNames(ids: string[], countries: Country[]) {
  return ids
    .map((id) => countries.find((country) => country.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

function BannerStatusCell({ banner, countries }: { banner: AdminPromoBanner; countries: Country[] }) {
  const status = getBannerStatus(banner, countries, new Date());

  switch (status.kind) {
    case "live":
      return (
        <div className="grid gap-1">
          <StatusBadge tone="green">Live</StatusBadge>
          <span className="text-xs text-zinc-500">{countryNames(status.countryIds, countries)}</span>
        </div>
      );
    case "scheduled":
      return <StatusBadge tone="blue">Scheduled</StatusBadge>;
    case "expired":
      return <StatusBadge>Expired</StatusBadge>;
    case "disabled":
      return <StatusBadge tone="yellow">Disabled</StatusBadge>;
    case "no-countries":
      return <StatusBadge tone="red">No countries</StatusBadge>;
  }
}

export default async function BannersPage() {
  await requireAdmin();
  const { banners, countries, error } = await listPromoBanners();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Banners"
        description="Announcement bar promotions shown above the storefront header. Schedules run in each country's local time, and only one banner shows at a time."
      />
      <details className="rounded-lg border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-zinc-950">Add banner</summary>
        <div className="mt-4">
          <PromoBannerForm countries={countries} />
        </div>
      </details>
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          {
            key: "banner",
            header: "Banner",
            render: (row) => (
              <div className="grid min-w-72 gap-2">
                <span className="font-medium text-zinc-950">{row.name}</span>
                <div className="overflow-hidden rounded border border-zinc-200 text-xs">
                  <PromoBannerStrip banner={row} preview />
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <BannerStatusCell banner={row} countries={countries} />,
          },
          {
            key: "countries",
            header: "Countries",
            render: (row) => (row.all_countries ? "All countries" : countryNames(row.country_ids, countries) || "-"),
          },
          {
            key: "schedule",
            header: "Schedule (local time)",
            render: (row) => {
              const outranking = banners.filter(
                (other) => bannersOverlap(row, other) && compareBannerPrecedence(other, row) < 0,
              );
              return (
                <div className="grid gap-1 text-sm">
                  <span>From {formatWallClock(row.starts_at) ?? "now"}</span>
                  <span>Until {formatWallClock(row.ends_at) ?? "no end"}</span>
                  {outranking.length > 0 ? (
                    <span className="text-xs text-amber-700">
                      Overlaps {outranking.map((other) => other.name).join(", ")}, which will show instead while both are live.
                    </span>
                  ) : null}
                </div>
              );
            },
          },
          { key: "priority", header: "Priority", render: (row) => row.priority },
          {
            key: "closable",
            header: "Closable",
            render: (row) => (row.is_dismissible === false ? "No, always shown" : "Yes"),
          },
          {
            key: "delete",
            header: "Delete",
            render: (row) => (
              <form action={deletePromoBanner.bind(null, row.id)}>
                <ConfirmSubmitButton
                  className="text-sm text-red-600 underline underline-offset-4"
                  message={`Permanently delete the "${row.name}" banner?`}
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        rows={banners}
      />
      <div className="grid gap-4">
        {banners.map((banner) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={banner.id}>
            <summary className="cursor-pointer font-medium">Edit {banner.name}</summary>
            <div className="mt-4">
              <PromoBannerForm banner={banner} countries={countries} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
