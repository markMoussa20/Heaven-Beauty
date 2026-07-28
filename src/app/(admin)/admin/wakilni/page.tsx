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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Wakilni"
        description="Configure API accounts, pickup locations, currencies, and encrypted credentials independently for every country."
      />
      <ErrorMessage message={countryResult.error ?? settingsResult.error} />
      <div className="grid gap-6">
        {countries.map((country) => (
          <WakilniSettingsForm
            country={country}
            key={country.id}
            settings={byCountry.get(country.id)}
          />
        ))}
      </div>
    </div>
  );
}

