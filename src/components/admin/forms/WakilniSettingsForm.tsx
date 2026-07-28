import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  KeyRound,
  LockKeyhole,
  MapPin,
  PlugZap,
  Settings2,
} from "lucide-react";
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
    "h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/5";
  const hasApiCredentials = Boolean(settings?.api_key_secret_id && settings?.api_secret_secret_id);
  const hasWebhookSecret = Boolean(settings?.webhook_secret_id);
  const isEnabled = settings?.enabled ?? false;
  const isTestSuccessful = settings?.last_test_status === "success";
  const isTestFailed = settings?.last_test_status === "failed";
  const status = isEnabled
    ? isTestSuccessful
      ? "Connected"
      : hasApiCredentials
        ? "Ready to test"
        : "Needs credentials"
    : settings
      ? "Disabled"
      : "Not configured";

  return (
    <details
      className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm open:border-zinc-300"
      open={isEnabled && hasApiCredentials}
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            isEnabled ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {country.code}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-950">
              {country.name}
            </h3>
            <StatusBadge
              status={status}
              tone={
                isTestSuccessful
                  ? "success"
                  : isEnabled
                    ? "warning"
                    : "neutral"
              }
            />
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {country.currency_code}
            {settings?.pickup_area ? ` · Pickup from ${settings.pickup_area}` : " · No pickup area set"}
          </p>
        </div>
        <div className="hidden items-center gap-5 text-xs text-zinc-500 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            {hasApiCredentials ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <CircleOff className="size-3.5" />
            )}
            Credentials
          </span>
          <span className="inline-flex items-center gap-1.5">
            {isTestSuccessful ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <CircleOff className="size-3.5" />
            )}
            Connection
          </span>
        </div>
        <ChevronDown className="size-5 shrink-0 text-zinc-400 transition group-open:rotate-180" />
      </summary>

      <div className="border-t border-zinc-200 bg-zinc-50/70 p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-start gap-3">
            {isTestSuccessful ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            ) : isTestFailed ? (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            ) : (
              <PlugZap className="mt-0.5 size-5 shrink-0 text-zinc-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {isTestSuccessful
                  ? "Connection is working"
                  : isTestFailed
                    ? "Connection test failed"
                    : "Connection has not been verified"}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {settings?.last_test_message ??
                  "Save the required settings, enable this country, then run a connection test."}
              </p>
            </div>
          </div>
          {settings ? (
            <form
              action={testWakilniConnection.bind(
                null,
                country.code,
                settings.id,
              )}
            >
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                disabled={!isEnabled || !hasApiCredentials}
                title={
                  !isEnabled
                    ? "Enable and save this country first"
                    : !hasApiCredentials
                      ? "Save API credentials first"
                      : undefined
                }
                type="submit"
              >
                <PlugZap className="size-4" />
                Test connection
              </button>
            </form>
          ) : null}
        </div>

        <form action={saveWakilniSettings} className="space-y-6">
          <input name="country_id" type="hidden" value={country.id} />

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-zinc-950">
                  Send {country.name} orders to Wakilni
                </h4>
                <p className="mt-1 text-sm text-zinc-500">
                  When disabled, checkout continues normally without creating a
                  Wakilni delivery.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-sm font-medium text-zinc-700">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
                <span className="relative inline-flex">
                  <input
                    className="peer sr-only"
                    defaultChecked={isEnabled}
                    name="enabled"
                    type="checkbox"
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-300 transition peer-checked:bg-zinc-950 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-950 peer-focus-visible:ring-offset-2" />
                  <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
              </label>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <SectionHeading
                description="The account endpoint used to authenticate and create deliveries."
                icon={<PlugZap className="size-4" />}
                title="API connection"
              />
              <div className="mt-5">
                <Field
                  hint="Use the URL supplied by Wakilni for this account."
                  label="API base URL"
                >
                  <input
                    className={field}
                    defaultValue={settings?.base_url ?? ""}
                    name="base_url"
                    placeholder="https://api.wakilni.com"
                    required
                    type="url"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <SectionHeading
                description="Where Wakilni should collect outgoing orders."
                icon={<MapPin className="size-4" />}
                title="Pickup location"
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Pickup area">
                  <input
                    className={field}
                    defaultValue={settings?.pickup_area ?? ""}
                    name="pickup_area"
                    placeholder="e.g. Dekwaneh"
                    required
                  />
                </Field>
                <Field
                  hint="The location number provided by Wakilni."
                  label="Location ID"
                >
                  <input
                    className={field}
                    defaultValue={settings?.pickup_location_id ?? 0}
                    min="0"
                    name="pickup_location_id"
                    required
                    type="number"
                  />
                </Field>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <SectionHeading
              description="Stored securely in Supabase Vault. Existing values are never displayed."
              icon={<LockKeyhole className="size-4" />}
              title="Credentials"
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <Field
                badge={hasApiCredentials ? "Saved" : "Required"}
                label="API key"
              >
                <input
                  autoComplete="off"
                  className={field}
                  name="api_key"
                  placeholder={
                    hasApiCredentials
                      ? "Saved — enter to replace"
                      : "Enter API key"
                  }
                  type="password"
                />
              </Field>
              <Field
                badge={hasApiCredentials ? "Saved" : "Required"}
                label="API secret"
              >
                <input
                  autoComplete="new-password"
                  className={field}
                  name="api_secret"
                  placeholder={
                    hasApiCredentials
                      ? "Saved — enter to replace"
                      : "Enter API secret"
                  }
                  type="password"
                />
              </Field>
              <Field
                badge={hasWebhookSecret ? "Saved" : "Optional"}
                label="Webhook secret"
              >
                <input
                  autoComplete="new-password"
                  className={field}
                  name="webhook_secret"
                  placeholder={
                    hasWebhookSecret
                      ? "Saved — enter to replace"
                      : "Enter webhook secret"
                  }
                  type="password"
                />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
              <KeyRound className="size-4 shrink-0" />
              Leave a saved credential blank to keep its current value.
            </div>
          </section>

          <details className="group/advanced rounded-xl border border-zinc-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
              <div className="rounded-lg bg-zinc-100 p-2 text-zinc-700">
                <Settings2 className="size-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-zinc-950">
                  Advanced delivery defaults
                </h4>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Coordinates and Wakilni reference IDs. Defaults usually do not
                  need to change.
                </p>
              </div>
              <ChevronDown className="size-5 text-zinc-400 transition group-open/advanced:rotate-180" />
            </summary>

            <div className="grid gap-4 border-t border-zinc-200 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Pickup floor">
                <input
                  className={field}
                  defaultValue={settings?.pickup_floor ?? 0}
                  name="pickup_floor"
                  type="number"
                />
              </Field>
              <Field label="Pickup latitude">
                <input
                  className={field}
                  defaultValue={settings?.pickup_latitude ?? 0}
                  name="pickup_latitude"
                  step="any"
                  type="number"
                />
              </Field>
              <Field label="Pickup longitude">
                <input
                  className={field}
                  defaultValue={settings?.pickup_longitude ?? 0}
                  name="pickup_longitude"
                  step="any"
                  type="number"
                />
              </Field>
              <Field label="Currency ID">
                <input
                  className={field}
                  defaultValue={settings?.currency_id ?? 0}
                  min="0"
                  name="currency_id"
                  type="number"
                />
              </Field>
              <Field label="Collection type ID">
                <input
                  className={field}
                  defaultValue={settings?.cash_collection_type_id ?? 52}
                  min="0"
                  name="cash_collection_type_id"
                  type="number"
                />
              </Field>
              <Field label="Package type ID">
                <input
                  className={field}
                  defaultValue={settings?.package_type_id ?? 58}
                  min="0"
                  name="package_type_id"
                  type="number"
                />
              </Field>
              <Field label="Receiver gender ID">
                <input
                  className={field}
                  defaultValue={settings?.default_receiver_gender ?? 1}
                  min="0"
                  name="default_receiver_gender"
                  type="number"
                />
              </Field>
              <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-zinc-200 px-3.5 text-sm font-medium text-zinc-800">
                <input
                  className="size-4 accent-zinc-950"
                  defaultChecked={settings?.express ?? false}
                  name="express"
                  type="checkbox"
                />
                Express delivery
              </label>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-5">
            <p className="text-xs text-zinc-500">
              Saving does not test the connection or submit any orders.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              type="submit"
            >
              <Check className="size-4" />
              Save {country.name}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}

function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone: "neutral" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 ring-amber-600/15"
        : "bg-zinc-100 text-zinc-600 ring-zinc-500/10";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${className}`}
    >
      {status}
    </span>
  );
}

function SectionHeading({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-zinc-100 p-2 text-zinc-700">{icon}</div>
      <div>
        <h4 className="text-sm font-semibold text-zinc-950">{title}</h4>
        <p className="mt-0.5 text-sm leading-5 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function Field({
  badge,
  children,
  hint,
  label,
}: {
  badge?: string;
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span className="flex items-center justify-between gap-2 text-zinc-800">
        {label}
        {badge ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {badge}
          </span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="text-xs font-normal leading-5 text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
