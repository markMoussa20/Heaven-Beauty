import {
  CheckCircle2,
  ExternalLink,
  Globe2,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { WakilniSettingsForm } from "@/components/admin/forms/WakilniSettingsForm";
import { listRows } from "@/lib/admin/data";
import type { Country, WakilniCountrySettings } from "@/types/database";

export const metadata = { title: "Wakilni" };

export default async function AdminWakilniPage() {
  const [countryResult, settingsResult] = await Promise.all([
    listRows("countries", { order: "name" }),
    listRows("wakilni_country_settings"),
  ]);
  const countries = countryResult.data as Country[];
  const settings = settingsResult.data as WakilniCountrySettings[];
  const byCountry = new Map(settings.map((row) => [row.country_id, row]));
  const enabledSettings = settings.filter((row) => row.enabled);
  const successfulConnections = settings.filter(
    (row) => row.last_test_status === "success",
  );
  const enabledCountryNames = countries
    .filter((country) => byCountry.get(country.id)?.enabled)
    .map((country) => country.name);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          title="Wakilni delivery"
          description="Manage the countries that send new orders to Wakilni."
        />
        <a
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:text-zinc-950"
          href="https://wiki.wakilni.com/integrations/api"
          rel="noreferrer"
          target="_blank"
        >
          API documentation
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
      <ErrorMessage message={countryResult.error ?? settingsResult.error} />

      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard
          icon={<Truck className="size-5" />}
          label="Active countries"
          value={`${enabledSettings.length} of ${countries.length}`}
          detail={
            enabledCountryNames.length
              ? enabledCountryNames.join(", ")
              : "No countries enabled"
          }
        />
        <OverviewCard
          icon={<CheckCircle2 className="size-5" />}
          label="Connections tested"
          value={`${successfulConnections.length}`}
          detail={
            successfulConnections.length
              ? "Authentication verified"
              : "Run a test after setup"
          }
        />
        <OverviewCard
          icon={<ShieldCheck className="size-5" />}
          label="Credential storage"
          value="Supabase Vault"
          detail="Keys are encrypted and never displayed"
        />
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-zinc-950">
              <Globe2 className="size-5" />
              <h2 className="text-lg font-semibold">Country accounts</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Open a country to review or change its setup. Disabled countries
              never send orders to Wakilni.
            </p>
          </div>
          <p className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600">
            {countries.length} countries
          </p>
        </div>

        <div className="grid gap-4">
        {countries.map((country) => (
          <WakilniSettingsForm
            country={country}
            key={country.id}
            settings={byCountry.get(country.id)}
          />
        ))}
        </div>
      </section>
    </div>
  );
}

function OverviewCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{detail}</p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-2.5 text-zinc-700">{icon}</div>
      </div>
    </div>
  );
}
