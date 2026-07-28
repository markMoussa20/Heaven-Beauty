import type { ReactNode } from "react";
import type { Country, WakilniCountrySettings } from "@/types/database";
import { saveWakilniSettings, testWakilniConnection } from "@/lib/admin/actions";

export function WakilniSettingsForm({
  country,
  settings,
}: {
  country: Country;
  settings?: WakilniCountrySettings | null;
}) {
  const field =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950";
  const hasApiCredentials = Boolean(settings?.api_key_secret_id && settings?.api_secret_secret_id);
  const hasWebhookSecret = Boolean(settings?.webhook_secret_id);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{country.name}</h2>
          <p className="text-sm text-zinc-500">
            {country.code} · {country.currency_code}
            {settings?.last_test_status
              ? ` · Last test: ${settings.last_test_status}`
              : " · Not tested"}
          </p>
          {settings?.last_test_message ? (
            <p className="mt-1 text-sm text-zinc-600">{settings.last_test_message}</p>
          ) : null}
        </div>
        {settings ? (
          <form action={testWakilniConnection.bind(null, country.code, settings.id)}>
            <button
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold"
              type="submit"
            >
              Test connection
            </button>
          </form>
        ) : null}
      </div>

      <form action={saveWakilniSettings} className="mt-5 grid gap-4 md:grid-cols-2">
        <input name="country_id" type="hidden" value={country.id} />
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input defaultChecked={settings?.enabled ?? false} name="enabled" type="checkbox" />
          Enable Wakilni for {country.name}
        </label>

        <Field label="API base URL">
          <input
            className={field}
            defaultValue={settings?.base_url ?? ""}
            name="base_url"
            placeholder="https://api.wakilni.com"
            type="url"
          />
        </Field>
        <Field label="Pickup area">
          <input className={field} defaultValue={settings?.pickup_area ?? ""} name="pickup_area" />
        </Field>
        <Field label="Pickup location ID">
          <input className={field} defaultValue={settings?.pickup_location_id ?? 0} name="pickup_location_id" type="number" />
        </Field>
        <Field label="Pickup floor">
          <input className={field} defaultValue={settings?.pickup_floor ?? 0} name="pickup_floor" type="number" />
        </Field>
        <Field label="Pickup latitude">
          <input className={field} defaultValue={settings?.pickup_latitude ?? 0} name="pickup_latitude" step="any" type="number" />
        </Field>
        <Field label="Pickup longitude">
          <input className={field} defaultValue={settings?.pickup_longitude ?? 0} name="pickup_longitude" step="any" type="number" />
        </Field>
        <Field label="Wakilni currency ID">
          <input className={field} defaultValue={settings?.currency_id ?? 0} name="currency_id" type="number" />
        </Field>
        <Field label="Collection type ID">
          <input className={field} defaultValue={settings?.cash_collection_type_id ?? 52} name="cash_collection_type_id" type="number" />
        </Field>
        <Field label="Package type ID">
          <input className={field} defaultValue={settings?.package_type_id ?? 58} name="package_type_id" type="number" />
        </Field>
        <Field label="Default receiver gender ID">
          <input className={field} defaultValue={settings?.default_receiver_gender ?? 1} name="default_receiver_gender" type="number" />
        </Field>

        <div className="border-t border-zinc-200 pt-4 md:col-span-2">
          <h3 className="font-semibold">Secrets</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Saved in Supabase Vault. Leave blank to retain an existing value.
          </p>
        </div>
        <Field label={`API key${hasApiCredentials ? " (saved)" : ""}`}>
          <input autoComplete="off" className={field} name="api_key" type="password" />
        </Field>
        <Field label={`API secret${hasApiCredentials ? " (saved)" : ""}`}>
          <input autoComplete="new-password" className={field} name="api_secret" type="password" />
        </Field>
        <Field label={`Webhook secret${hasWebhookSecret ? " (saved)" : ""}`}>
          <input autoComplete="new-password" className={field} name="webhook_secret" type="password" />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input defaultChecked={settings?.express ?? false} name="express" type="checkbox" />
          Express delivery
        </label>

        <div className="md:col-span-2">
          <button className="rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white" type="submit">
            Save Wakilni settings
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
