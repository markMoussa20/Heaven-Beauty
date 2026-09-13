"use client";

import { useEffect, useState } from "react";

import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { PromoBannerStrip } from "@/components/layout/PromoBannerStrip";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { savePromoBanner } from "@/lib/admin/promo-banner-actions";
import { resolveCountryTimeZone } from "@/lib/promo-banners/schedule";
import type { Country, PromoBanner } from "@/types/database";

const inputClassName = "h-10 rounded-md border border-zinc-300 px-3";

const DEFAULT_COLORS = {
  background_color: "#6c93c4",
  text_color: "#ffffff",
  button_background_color: "#ffffff",
  button_text_color: "#6c93c4",
};

type ColorKey = keyof typeof DEFAULT_COLORS;

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "background_color", label: "Bar background" },
  { key: "text_color", label: "Bar text" },
  { key: "button_background_color", label: "Button background" },
  { key: "button_text_color", label: "Button text" },
];

function toDateTimeLocal(value: string | null | undefined) {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

export function PromoBannerForm({
  banner,
  countries,
}: {
  banner?: PromoBanner & { country_ids: string[] };
  countries: Country[];
}) {
  const action = savePromoBanner.bind(null, banner?.id ?? null);
  const [message, setMessage] = useState(banner?.message ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner?.cta_label ?? "");
  const [colors, setColors] = useState<Record<ColorKey, string>>({
    background_color: banner?.background_color ?? DEFAULT_COLORS.background_color,
    text_color: banner?.text_color ?? DEFAULT_COLORS.text_color,
    button_background_color: banner?.button_background_color ?? DEFAULT_COLORS.button_background_color,
    button_text_color: banner?.button_text_color ?? DEFAULT_COLORS.button_text_color,
  });
  const [allCountries, setAllCountries] = useState(banner?.all_countries ?? true);
  const [isDismissible, setIsDismissible] = useState(banner?.is_dismissible ?? true);
  const [removeImage, setRemoveImage] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

  const previewImageUrl = selectedImageUrl ?? (removeImage ? null : banner?.image_url ?? null);
  const fieldPrefix = banner?.id ?? "new";

  return (
    <AdminActionForm action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2">
      <div className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium text-zinc-700">Live preview</span>
        <div className="overflow-hidden rounded-md border border-zinc-200">
          <PromoBannerStrip
            banner={{
              message,
              cta_label: ctaLabel || null,
              cta_href: null,
              image_url: previewImageUrl,
              is_dismissible: isDismissible,
              ...colors,
            }}
            preview
          />
        </div>
      </div>

      <AdminFormField hint="Only visible to admins." label="Internal name">
        <input className={inputClassName} defaultValue={banner?.name ?? ""} maxLength={100} name="name" required />
      </AdminFormField>
      <AdminFormField hint="When several banners are live, the highest priority is shown." label="Priority">
        <input className={inputClassName} defaultValue={String(banner?.priority ?? 0)} max={1000} min={-1000} name="priority" step={1} type="number" />
      </AdminFormField>

      <div className="md:col-span-2">
        <AdminFormField label="Message">
          <input
            className={inputClassName}
            maxLength={200}
            name="message"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Buy 2, get 1 free on all skincare"
            required
            value={message}
          />
        </AdminFormField>
      </div>

      <AdminFormField hint="Optional. Leave both button fields empty for no button." label="Button label">
        <input
          className={inputClassName}
          maxLength={40}
          name="cta_label"
          onChange={(event) => setCtaLabel(event.target.value)}
          placeholder="Shop now"
          value={ctaLabel}
        />
      </AdminFormField>
      <AdminFormField hint="A site path like /shop or a full https:// URL." label="Button link">
        <input className={inputClassName} defaultValue={banner?.cta_href ?? ""} maxLength={500} name="cta_href" placeholder="/shop" />
      </AdminFormField>

      <div className="grid gap-2 md:col-span-2">
        <span className="text-sm font-medium text-zinc-700">Image (optional)</span>
        <input
          accept="image/avif,image/png,image/jpeg,image/jpg,image/webp"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          name="banner_image"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && file.size > 5 * 1024 * 1024) {
              setImageError("Images must be 5MB or smaller.");
              event.target.value = "";
              setSelectedImageUrl(null);
              return;
            }
            setImageError(null);
            setSelectedImageUrl(file ? URL.createObjectURL(file) : null);
          }}
          type="file"
        />
        <span className="text-xs text-zinc-500">Shown at 28px tall before the message. Transparent PNG or WebP works best.</span>
        {imageError ? <p className="text-xs text-red-600">{imageError}</p> : null}
        {banner?.image_url ? (
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              checked={removeImage}
              name="remove_image"
              onChange={(event) => setRemoveImage(event.target.checked)}
              type="checkbox"
            />
            Remove current image
          </label>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
        {COLOR_FIELDS.map((field) => (
          <label className="grid gap-2 text-sm font-medium text-zinc-700" key={field.key}>
            <span>{field.label}</span>
            <span className="flex items-center gap-2">
              <input
                className="h-10 w-12 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
                name={field.key}
                onChange={(event) => setColors((current) => ({ ...current, [field.key]: event.target.value }))}
                type="color"
                value={colors[field.key]}
              />
              <span className="font-mono text-xs uppercase text-zinc-500">{colors[field.key]}</span>
            </span>
          </label>
        ))}
      </div>

      <AdminFormField hint="In each country's local time. Leave empty to start immediately." label="Starts at">
        <input className={inputClassName} defaultValue={toDateTimeLocal(banner?.starts_at)} name="starts_at" type="datetime-local" />
      </AdminFormField>
      <AdminFormField hint="In each country's local time. The banner hides at this moment. Leave empty to never end." label="Ends at">
        <input className={inputClassName} defaultValue={toDateTimeLocal(banner?.ends_at)} name="ends_at" type="datetime-local" />
      </AdminFormField>

      <fieldset className="grid gap-3 md:col-span-2">
        <legend className="mb-2 text-sm font-medium text-zinc-700">Countries</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input checked={allCountries} name="all_countries" onChange={() => setAllCountries(true)} type="radio" value="true" />
            All countries
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input checked={!allCountries} name="all_countries" onChange={() => setAllCountries(false)} type="radio" value="false" />
            Specific countries
          </label>
        </div>
        {!allCountries ? (
          <div className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-2">
            {countries.map((country) => (
              <label className="flex items-center gap-2 text-sm text-zinc-700" htmlFor={`${fieldPrefix}-country-${country.id}`} key={country.id}>
                <input
                  defaultChecked={banner?.country_ids.includes(country.id) ?? false}
                  id={`${fieldPrefix}-country-${country.id}`}
                  name="country_ids"
                  type="checkbox"
                  value={country.id}
                />
                <span>
                  {country.name}
                  <span className="ml-1 text-xs text-zinc-500">({resolveCountryTimeZone(country)})</span>
                  {!country.is_active ? <span className="ml-1 text-xs text-amber-600">inactive</span> : null}
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap gap-4 md:col-span-2">
        <InlineCheckbox defaultChecked={banner?.is_enabled ?? true} label="Enabled" name="is_enabled" />
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            checked={isDismissible}
            name="is_dismissible"
            onChange={(event) => setIsDismissible(event.target.checked)}
            type="checkbox"
          />
          Visitors can close this banner
        </label>
        <span className="w-full text-xs text-zinc-500">
          When unticked, the close button is hidden and the banner stays visible for its whole schedule.
        </span>
      </div>
      <div className="md:col-span-2">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save banner
        </SubmitButton>
      </div>
    </AdminActionForm>
  );
}
